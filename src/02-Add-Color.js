import React, {useEffect, useState} from 'react';
import {Shaders, Node, GLSL, Uniform} from 'gl-react';
import {Surface} from 'gl-react-dom'; // for React DOM
import Blur from "./Blur";
import './11-Final.css';

const shaders = Shaders.create({
  AddColor: {
    frag: GLSL`
precision highp float;

float c_textureSize = 16.0;

#define c_onePixel  (1.0 / c_textureSize)
#define c_twoPixels  (2.0 / c_textureSize)

varying vec2 uv;
uniform sampler2D t;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;
uniform vec3 color5;


vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0)
        hue += 1.0;
    else if (hue > 1.0)
        hue -= 1.0;
    float res;
    if ((6.0 * hue) < 1.0)
        res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0)
        res = f2;
    else if ((3.0 * hue) < 2.0)
        res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else
        res = f1;
    return res;
}

vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb;
    
    if (hsl.y == 0.0) {
        rgb = vec3(hsl.z); // Luminance
    } else {
        float f2;
        
        if (hsl.z < 0.5)
            f2 = hsl.z * (1.0 + hsl.y);
        else
            f2 = hsl.z + hsl.y - hsl.y * hsl.z;
            
        float f1 = 2.0 * hsl.z - f2;
        
        rgb.r = hue2rgb(f1, f2, hsl.x + (1.0/3.0));
        rgb.g = hue2rgb(f1, f2, hsl.x);
        rgb.b = hue2rgb(f1, f2, hsl.x - (1.0/3.0));
    }   
    return rgb;
}

vec3 rgb2hsl(vec3 color) {
     vec3 hsl; // init to 0 to avoid warnings ? (and reverse if + remove first part)

     float fmin = min(min(color.r, color.g), color.b); //Min. value of RGB
     float fmax = max(max(color.r, color.g), color.b); //Max. value of RGB
     float delta = fmax - fmin; //Delta RGB value

     hsl.z = (fmax + fmin) / 2.0; // Luminance

     if (delta == 0.0) //This is a gray, no chroma...
     {
         hsl.x = 0.0; // Hue
         hsl.y = 0.0; // Saturation
     } else //Chromatic data...
     {
         if (hsl.z < 0.5)
             hsl.y = delta / (fmax + fmin); // Saturation
         else
             hsl.y = delta / (2.0 - fmax - fmin); // Saturation

         float deltaR = (((fmax - color.r) / 6.0) + (delta / 2.0)) / delta;
         float deltaG = (((fmax - color.g) / 6.0) + (delta / 2.0)) / delta;
         float deltaB = (((fmax - color.b) / 6.0) + (delta / 2.0)) / delta;

         if (color.r == fmax)
             hsl.x = deltaB - deltaG; // Hue
         else if (color.g == fmax)
             hsl.x = (1.0 / 3.0) + deltaR - deltaB; // Hue
         else if (color.b == fmax)
             hsl.x = (2.0 / 3.0) + deltaG - deltaR; // Hue

         if (hsl.x < 0.0)
             hsl.x += 1.0; // Hue
         else if (hsl.x > 1.0)
             hsl.x -= 1.0; // Hue
     }

     return hsl;
 }


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

  vec3 col1 = rgb2hsl(color1); 
  vec3 col2 = rgb2hsl(color2); 
  vec3 col3 = rgb2hsl(color3); 
  vec3 col4 = rgb2hsl(color4); 
  vec3 col5 = rgb2hsl(color5); 

  vec3 col = rgb2hsl(texture2D(t, uv.xy).xyz);
  vec2 start = vec2(0.0, 0.0);
  vec2 end = vec2(0.0, 0.0);
   
  float l =  col.z;
  float step = 0.1;
  if (l < step) {
    col.xy = mix(start, col1.xy, (l-step*0.0)/step);
  }else if (l < step*2.0) {
    col.xy = mix(col1.xy, col2.xy, (l-step*1.0)/step);
  }else if (l < step*3.0) {
    col.xy = mix(col2.xy, col3.xy, (l-step*2.0)/step);
  }else if (l < step*4.0) {
    col.xy = mix(col3.xy, col4.xy, (l-step*3.0)/step);
  }else if (l < step*5.0){
    col.xy = mix(col4.xy, col5.xy, (l-step*4.0)/step);
  }else if (l < step*6.0){
    col.xy = mix(col5.xy, end, (l-step*5.0)/step);
  }
  
  gl_FragColor = vec4(hsl2rgb(col), 1.0);
  
	// gl_FragColor = mix(col_origin, col, 1.0);
}`
  }
});


const AddColor = ({children: t, uniforms}) => {
  return <Node shader={shaders.AddColor} uniforms={{
    t: t,
    ...uniforms,
  }}/>;
}
export default AddColor;