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


float random(float income){
    return fract( (sin(income) * 4698.0101255) + (sin(income) * 29189.92918) + (sin(income) * 8.327) );
}


void main() {

  // vec3 col1 = rgb2hsl(color1); 
  // vec3 col2 = rgb2hsl(color2); 
  // vec3 col3 = rgb2hsl(color3); 
  // vec3 col4 = rgb2hsl(color4); 
  // vec3 col5 = rgb2hsl(color5); 
  // vec3 col = rgb2hsl(texture2D(t, uv.xy).xyz);
  //
  // vec3 origin_col = col;
  // float l = (col.z - 0.5)*1.0 + 0.5;
  // vec3 start = vec3(0.0, 0.0, 0.0);
  // vec3 end = vec3(1.0, 1.0, 1.0);
  // if (l < 0.34) {
  //   col.xyz = mix(start, col1.xyz, l/0.34*l/0.34);
  //   // col.yz = origin_col.yz; 
  //   // col.yz =  mix(origin_col.yz, col.yz, 0.5);
  // }else if (l < 0.42) {
  //   col.xyz = mix(col1.xyz, col2.xyz, (l-0.34)/0.08);
  //   // col.yz = origin_col.yz; 
  //   // col.yz =  mix(origin_col.yz, col.yz, 0.5);
  // }else if (l < 0.50) {
  //   col.xyz = mix(col2.xyz, col3.xyz, (l-0.42)/0.08);
  //   // col.yz = origin_col.yz; 
  //   // col.yz =  mix(origin_col.yz, col.yz, 0.5);
  // }else if (l < 0.58) {
  //   col.xyz = mix(col3.xyz, col4.xyz, (l-0.50)/0.08);
  //   // col.yz = origin_col.yz; 
  //   // col.yz =  mix(origin_col.yz, col.yz, 0.5);
  // }else if (l < 0.66){
  //   col.xyz = mix(col4.xyz, col5.xyz, (l-0.58)/0.08);
  //   // col.yz = origin_col.yz; 
  //   // col.yz =  mix(origin_col.yz, col.yz, 0.5);
  // }else {
  //   col.xyz = mix(col5.xyz, end, (l-0.66)/0.34);
  //   // col.yz = origin_col.yz; 
  //   // col.yz =  mix(origin_col.yz, col.yz, 0.5);
  // }
  // col = hsl2rgb(col);
  // gl_FragColor = vec4(col, 1.0);
  
  
  // rgb
  
  vec3 col1 = color1; 
  vec3 col2 = color2; 
  vec3 col3 = color3; 
  vec3 col4 = color4; 
  vec3 col5 = color5; 
  vec3 col = texture2D(t, uv.xy).xyz;
  vec3 origin_col = rgb2hsl(col);
  // float l = (origin_col.z - 0.5)*2.0 + 0.5;
  float l = sqrt(origin_col.z);
  vec3 start = vec3(0.0, 0.0, 0.0);
  vec3 end = vec3(1.0, 1.0, 1.0);
  // if (l < 0.34) {
  //   col.xyz = mix(start, col1.xyz, l/0.34*l/0.34);
  //   col = rgb2hsl(col);
  //   // col.z = origin_col.z;
  // }else if (l < 0.42) {
  //   col.xyz = mix(col1.xyz, col2.xyz, (l-0.34)/0.08);
  //   col = rgb2hsl(col);
  //   // col.z = origin_col.z;
  // }else if (l < 0.50) {
  //   col.xyz = mix(col2.xyz, col3.xyz, (l-0.42)/0.08);
  //   col = rgb2hsl(col);
  //   // col.z = origin_col.z;
  // }else if (l < 0.58) {
  //   col.xyz = mix(col3.xyz, col4.xyz, (l-0.50)/0.08);
  //   col = rgb2hsl(col);
  //   // col.z = origin_col.z;
  // }else if (l < 0.66){
  //   col.xyz = mix(col4.xyz, col5.xyz, (l-0.58)/0.08);
  //   col = rgb2hsl(col);
  //   // col.z = origin_col.z;
  // }else {
  //   col.xyz = mix(col5.xyz, end, (l-0.66)/0.34);
  //   col = rgb2hsl(col);
  //   // col.z = origin_col.z;
  // }
  
  // if (l < 0.4) {
  //   col.xyz = mix(start, col1.xyz, l/0.4*l/0.4);
  //   col = rgb2hsl(col);
  //   col.z = origin_col.z;
  // }else if (l < 0.45) {
  //   col.xyz = mix(col1.xyz, col2.xyz, (l-0.40)/0.05);
  //   col = rgb2hsl(col);
  //   col.z = (origin_col.z + 0.2*col.z)/1.2;
  // }else if (l < 0.50) {
  //   col.xyz = mix(col2.xyz, col3.xyz, (l-0.45)/0.05);
  //   col = rgb2hsl(col);
  //   col.z = (origin_col.z + 0.4*col.z)/1.4;
  // }else if (l < 0.55) {
  //   col.xyz = mix(col3.xyz, col4.xyz, (l-0.50)/0.05);
  //   col = rgb2hsl(col);
  //   col.z = (origin_col.z + 0.6*col.z)/1.6;
  // }else if (l < 0.60){
  //   col.xyz = mix(col4.xyz, col5.xyz, (l-0.55)/0.05);
  //   col = rgb2hsl(col);
  //   col.z = (origin_col.z + 0.8*col.z)/1.8;
  // }else {
  //   col.xyz = mix(col5.xyz, end, (l-0.65)/0.35);
  //   col = rgb2hsl(col);
  // }
  // col = hsl2rgb(col);
  // gl_FragColor = vec4(col, 1.0);
  
  if (l < 0.4) {
    col.xyz = mix(start, col1.xyz, l/0.4*l/0.4);
  }else if (l < 0.45) {
    col.xyz = mix(col1.xyz, col2.xyz, (l-0.40)/0.05);
  }else if (l < 0.50) {
    col.xyz = mix(col2.xyz, col3.xyz, (l-0.45)/0.05);
  }else if (l < 0.55) {
    col.xyz = mix(col3.xyz, col4.xyz, (l-0.50)/0.05);
  }else if (l < 0.60){
    col.xyz = mix(col4.xyz, col5.xyz, (l-0.55)/0.05);
  }else {
    col.xyz = mix(col5.xyz, end, (l-0.65)/0.35);
  }
  col = rgb2hsl(col);
  col.z = (origin_col.z + col.z)*0.5;
  col = hsl2rgb(col);
  
  float contrast = 1.2;
	col = vec4(((col-vec3(0.5))*contrast)+vec3(0.5), 1.0);
  
  gl_FragColor = vec4(col, 1.0); 
  
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
