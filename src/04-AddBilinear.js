import React from 'react';
import {Shaders, Node, GLSL,} from 'gl-react';

const shaders = Shaders.create({
  AddBiliner: {
    frag: GLSL`
precision highp float;

float c_textureSize = 16.0;

#define c_onePixel  (1.0 / c_textureSize)
#define c_twoPixels  (2.0 / c_textureSize)

varying vec2 uv;
uniform sampler2D t;


vec3 BilinearTextureSample (sampler2D iChannel0, vec2 P)
{
    vec2 pixel = P * c_textureSize + 0.5;
    
    vec2 frac = fract(pixel);
    pixel = (floor(pixel) / c_textureSize) - vec2(c_onePixel/2.0);

    vec3 C11 = texture2D(iChannel0, pixel + vec2( 0.0        , 0.0)).xyz;
    vec3 C21 = texture2D(iChannel0, pixel + vec2( c_onePixel , 0.0)).xyz;
    vec3 C12 = texture2D(iChannel0, pixel + vec2( 0.0        , c_onePixel)).xyz;
    vec3 C22 = texture2D(iChannel0, pixel + vec2( c_onePixel , c_onePixel)).xyz;

    vec3 x1 = mix(C11, C21, frac.x);
    vec3 x2 = mix(C12, C22, frac.x);
    return mix(x1, x2, frac.y);
}

void main() {
	vec3 col = BilinearTextureSample(t, uv.xy);
	float contrast = 0.8;
	col = ((col-vec3(0.5))*contrast)+vec3(0.5);
	col = clamp(col, 0.0, 1.0);
	gl_FragColor = vec4(col, 1.0);
}`
  }
});


const AddBiliner = ({children: t}) => {
  return <Node shader={shaders.AddBiliner} uniforms={{
    t: t,
  }}/>;
}
export default AddBiliner;
