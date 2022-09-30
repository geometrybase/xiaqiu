import React, {useEffect, useState} from 'react';
import {Shaders, Node, GLSL} from 'gl-react';
import {Surface} from 'gl-react-dom'; // for React DOM
import './AnimatedBackground.css';

const shaders = Shaders.create({
  helloBlue: {
    frag: GLSL`
precision highp float;

varying vec2 uv;
uniform float widthRatio;
uniform float screenRatio;
uniform float time;
uniform sampler2D t;
uniform sampler2D t1;
uniform sampler2D t2;
uniform sampler2D t3;
uniform sampler2D t4;
uniform sampler2D t5;

//    Classic Perlin 3D Noise 
//    by Stefan Gustavson
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}


float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

float noise(vec3 p){
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);

    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);

    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));

    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

    return o4.y * d.y + o4.x * (1.0 - d.y);
}


float fbm(vec3 x) {
    float c = 0.;
    float s = 0.;
    for (float i = 0.5; i <= 1.0; i+= .5) {
        float a = i; //pow(2.0, i);
        float b = 1. / a;
        c += cnoise(x*a)*b;
        s += b;
    }
    return c/s;
}

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

void main() {
  vec2 pos = vec2(uv.x*widthRatio, uv.y);
  
  vec3 img1 = rgb2hsl(texture2D(t1, pos).xyz);
  vec3 img2 = rgb2hsl(texture2D(t2, pos).xyz);
  vec3 img3 = rgb2hsl(texture2D(t3, pos).xyz);
  vec3 img4 = rgb2hsl(texture2D(t4, pos).xyz);
  vec3 img5 = rgb2hsl(texture2D(t5, pos).xyz);

  float s_factor = 0.0001;
  img1.z = fract(img1.z + time*s_factor);
  img2.z = fract(img2.z + time*s_factor);
  img3.z = fract(img3.z + time*s_factor);
  img4.z = fract(img4.z + time*s_factor);
  img5.z = fract(img5.z + time*s_factor);

  vec3 img_merged = (img1+img2+img3+img4+img5)/5.0;
  img_merged.y = 1.0-fract(time*s_factor);
  // gl_FragColor = vec4(hsl2rgb(img_merged), 1.0);

  // noise1
  float a = fbm(vec3(uv.x*10.0*screenRatio, uv.y*10.0, time*0.0001));
  // float b = smoothstep(0.0, 1.0, a - 0.05);
  // img_merged.z = mix(
  //   img_merged.z, 
  //   max(1.0, img_merged.z+pow(a+0.25, 3.0)), 
  //   b
  // );
  img_merged.z = fract(img_merged.z + img_merged.z/(1.0-a));
  img_merged.x = 1.0;
  img_merged.y = 0.0;
  gl_FragColor = vec4(hsl2rgb(img_merged), 1.0);

  
  // // pos.x += 0.000001*time;
  // pos.x = fract(pos.x);
  // // float a = fbm(vec3(uv.x*1.0*screenRatio, uv.y*1.0, time*0.0001));
  // float a = fbm(vec3(uv.x*50.0*screenRatio, uv.y*50.0, time*0.0001));
  // vec3 color = hsv2rgb(vec3(a, 1.0, 1.0));
  // vec3 targetColor = rgb2hsl(texture2D(t, pos).xyz);
  //
  
  //
  //
  // float b = smoothstep(0.0, 1.0, a - 0.05);
  // targetColor.z = mix(
  //   targetColor.z, 
  //   max(1.0, targetColor.z+pow(a+0.25, 3.0)), 
  //   b
  // );
  // gl_FragColor = vec4(hsl2rgb(targetColor), 1.0);
  
  // float cn = cnoise(vec3(uv.x*10.0*screenRatio, uv.y*10.0, time*0.0005));
  // gl_FragColor = vec4(n, n, n, 1.0);
  // return
  // gl_FragColor = vec4(n, n, n, 1.0);
  // img_merged.z = cn;
  // gl_FragColor = vec4(hsl2rgb(img_merged), 1.0);
  

  
}`,
  },
});

function shuffle(array) {
  var currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

let af = null;

function AnimatedBackground({width, height, onClick}) {
  const [time, setTime] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);
  useEffect(() => {
    let startTime, lastTime;
    let interval = 1000 / 10;
    lastTime = -interval;

    function loop(t) {
      af = requestAnimationFrame(loop);
      if (!startTime) startTime = t;
      if (t - lastTime > interval) {
        lastTime = t;
        setTime(t - startTime);
      }
    }

    requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(af);
    };
  }, []);

  let widthRatio = 1.0; // width / height / (1336.0 / 700.0);
  return (
    <div className={'AnimatedBackground'} onClick={onClick}>
      <Surface width={width} height={height} pixelRatio={window.devicePixelRatio}>
        <Node
          shader={shaders.helloBlue}
          uniforms={{
            // t: '/home-bg.jpg',
            t: './1.jpg',
            t1: './1.jpg',
            t2: './2.jpg',
            t3: './3.jpg',
            t4: './4.jpg',
            t5: './5.png',
            time: time,
            widthRatio: widthRatio,
            screenRatio: width / height,
          }}
        />
      </Surface>
    </div>
  );
}

export default AnimatedBackground;
