import React, {useEffect, useState} from 'react';
import {Shaders, Node, GLSL, Uniform} from 'gl-react';
import {Surface} from 'gl-react-dom'; // for React DOM
import Blur from "./Blur";
import './11-Final.css';

const shaders = Shaders.create({
  AddNoise: {
    frag: GLSL`
precision highp float;

float c_textureSize = 16.0;

#define c_onePixel  (1.0 / c_textureSize)
#define c_twoPixels  (2.0 / c_textureSize)

varying vec2 uv;
uniform sampler2D t1;
uniform sampler2D t2;


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
  vec3 col1 = texture2D(t1, uv.xy).xyz;
	vec3 col2 = BilinearTextureSample(t2, uv.xy);
	float contrast = 2.0;
	col2 = ((col2-vec3(0.5))*contrast)+vec3(0.5);
	col2 = clamp(col2, 0.0, 1.0);
	gl_FragColor = vec4(col2*col1, 1.0);
}`
  }
});


const Mix = ({children: ts}) => {
  return <Node shader={shaders.AddNoise} uniforms={{
    t1: ts[0],
    t2: ts[1],
  }}/>;
}
export default Mix;
