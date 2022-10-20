import React, {useEffect, useState} from 'react';
import {Shaders, Node, GLSL, Uniform} from 'gl-react';
import {Surface} from 'gl-react-dom'; // for React DOM
import {FastAverageColor} from "fast-average-color";
import AddNoise from "./03-AddNoise"
import './11-Final.css';
import AddColor from "./02-Add-Color";
import AddBiliner from "./04-AddBilinear";

const axios = require('axios').default;

const shaders = Shaders.create({
  Merge5To1: {
    frag: GLSL`
precision highp float;

varying vec2 uv;
uniform float iTime;
uniform sampler2D t1;
uniform sampler2D t2;
uniform sampler2D t3;
uniform sampler2D t4;
uniform sampler2D t5;

float c_textureSize = 64.0;

#define c_onePixel  (1.0 / c_textureSize)
#define c_twoPixels  (2.0 / c_textureSize)

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



vec4 softLightBlendFilter(vec4 base,vec4 overlay){
    return base * (overlay.a * (base / base.a) + (2.0 * overlay * (1.0 - (base / base.a)))) + overlay * (1.0 - base.a) + base * (1.0 - overlay.a);
}

void main() {
  vec2 pos = vec2(uv.x, uv.y);
	vec3 col1 = BilinearTextureSample(t1, uv.xy);
	vec3 col2 = BilinearTextureSample(t2, uv.xy);
	vec3 col3 = BilinearTextureSample(t3, uv.xy);
	vec3 col4 = BilinearTextureSample(t4, uv.xy);
	vec3 col5 = BilinearTextureSample(t5, uv.xy);
	
	col1 = rgb2hsl(col1);
	col1.y = 0.0*iTime;
	col1 = hsl2rgb(col1);
	
	col2 = rgb2hsl(col2);
	col2.y = 0.0;
	col2 = hsl2rgb(col2);
	
	col3 = rgb2hsl(col3);
	col3.y = 0.0;
	col3 = hsl2rgb(col3);
	
	col4 = rgb2hsl(col4);
	col4.y = 0.0;
	col4 = hsl2rgb(col4);
	
	col5 = rgb2hsl(col5);
	col5.y = 0.0;
	col5 = hsl2rgb(col5);
	
	col1 = softLightBlendFilter(vec4(col1, 1.0), vec4(col2,1.0)).xyz;
	col1 = softLightBlendFilter(vec4(col1, 1.0), vec4(col3,1.0)).xyz;
	col1 = softLightBlendFilter(vec4(col1, 1.0), vec4(col4,1.0)).xyz;
	col1 = softLightBlendFilter(vec4(col1, 1.0), vec4(col5,1.0)).xyz;
	
	float contrast = 0.8;
	vec4 finalColor = vec4(((col1-vec3(0.5))*contrast)+vec3(0.5), 1.0);
	
	gl_FragColor = clamp(finalColor, 0.0, 1.0);
}`,
  },
  PerlinNoise: {
    frag: GLSL`
precision highp float;

varying vec2 uv;

vec2 hash( vec2 p ) // replace this by something better
{
  p = vec2( dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)) );
  return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float noise(vec2 p )
{
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;
    vec2  i = floor( p + (p.x+p.y)*K1 );
    vec2  a = p - i + (i.x+i.y)*K2;
    float m = step(a.y,a.x); 
    vec2  o = vec2(m,1.0-m);
    vec2  b = a - o + K2;
    vec2  c = a - 1.0 + 2.0*K2;
    vec3  h = max( 0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );
    vec3  n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
    return dot( n, vec3(70.0) );
}

void main() {
  float f = noise( 16.0*uv.xy );
  f = 0.5 + 0.4*f;
	gl_FragColor = vec4(f,f,f,1.0);
}`
  },
  PerlinNoise2: {
    frag: GLSL`
precision highp float;
varying vec2 uv;

float hash(float v) 
{ 
    // Even more pseudo randomness
    return fract(fract(v*11.3334)*fract(v*91.73362341)*43.123*429.32234643);  
}

float hash(vec2 v) 
{ 
    // Random numbers thrown together to produce other random numbers
    return fract(hash(v.x*.97+v.y*.98)*143.94213); 
}

// https://en.wikipedia.org/wiki/Perlin_noise
float perlin_noise(vec2 position){
    // Fractional part is used for interpolation
	vec2 fractional_part = fract(position);
    // Integral part is used for sampling the hash function
	vec2 integral_part = position-fractional_part;
    
    // Positon of the 4 nearest grid points
	vec2 pos_00 = integral_part+vec2(0,0);
	vec2 pos_10 = integral_part+vec2(1,0);
	vec2 pos_11 = integral_part+vec2(1,1);
	vec2 pos_01 = integral_part+vec2(0,1);

	// Random gradient angle for each point
	const float pi = 3.1415926535;
	float ang_00=hash(pos_00)*2.0*pi;
	float ang_10=hash(pos_10)*2.0*pi;
	float ang_11=hash(pos_11)*2.0*pi;
	float ang_01=hash(pos_01)*2.0*pi;

	// Gradient vector for each point
	vec2 grad_00 = vec2(cos(ang_00), sin(ang_00));
	vec2 grad_10 = vec2(cos(ang_10), sin(ang_10));
	vec2 grad_11 = vec2(cos(ang_11), sin(ang_11));
	vec2 grad_01 = vec2(cos(ang_01), sin(ang_01));

	// Distance to each point
	vec2 dist_00 = vec2(0,0) - fractional_part;
	vec2 dist_10 = vec2(1,0) - fractional_part;
	vec2 dist_11 = vec2(1,1) - fractional_part;
	vec2 dist_01 = vec2(0,1) - fractional_part;

	// Dot products and interpolation
	return mix(
		mix(dot(dist_00, grad_00),dot(dist_10, grad_10),smoothstep(0.0, 1.0, fractional_part.x)),
		mix(dot(dist_01, grad_01),dot(dist_11, grad_11),smoothstep(0.0, 1.0, fractional_part.x)),
		smoothstep(0.0, 1.0, fractional_part.y)
	)*.5+.5;
}

float fractal_perlin_noise(vec2 position){
	float value = 0.0;
    // Sum together various layers of noise
	for (int i=1; i<16; i++)
	{
		float scale = pow(2.0,float(i)); // At different scales
		float contrib = 1.0/scale; // Weighted accordint to scale
		value += perlin_noise(position*scale)*contrib;
	}
	return value;
}
void main() {
  float f = fractal_perlin_noise( uv.xy*2.0);
  f =  0.1+ 0.9*f;
	gl_FragColor = vec4(f,f,f,1.0);
}
`
  }
});


export const DiamondCrop = ({children: t}) => {
  return <Node shader={shaders.DiamondCrop} uniforms={{t}}/>;
}

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


export const DownSample = ({children: t}) => {
  return <Node shader={shaders.DownSample} uniforms={{t}}/>;
}

function hexToRgb(hex) {
  let result = /^0x#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16) / 255.0,
    parseInt(result[2], 16) / 255.0,
    parseInt(result[3], 16) / 255.0
  ] : null;
}

var queryTimer = null

function AnimatedBackground({width, height, children: t}) {
  // const [iTime, setITime] = useState(0);

  // const [color1, setColor1] = useState(null);
  // const [color2, setColor2] = useState(null);
  // const [color3, setColor3] = useState(null);
  // const [color4, setColor4] = useState(null);
  // const [color5, setColor5] = useState(null);

  const [images, setImages] = useState(null);

  const queryImages = () => {
    axios.post("https://www.unrooted.art/api/image/find", {
      "limit": 5, "sort": [["created_at", -1]]
    }).then(function ({data}) {
      if (data.code === 0 && !!data.data && !!data.data.results && data.data.results.length === 5) {
        let c1 = hexToRgb(data.data.results[0].color)
        let c2 = hexToRgb(data.data.results[1].color)
        let c3 = hexToRgb(data.data.results[2].color)
        let c4 = hexToRgb(data.data.results[3].color)
        let c5 = hexToRgb(data.data.results[4].color)
        let u1 = "///" + data.data.results[0].url
        let u2 = "///" + data.data.results[1].url
        let u3 = "///" + data.data.results[2].url
        let u4 = "///" + data.data.results[3].url
        let u5 = "///" + data.data.results[4].url
        if (!!c1 && !!c2 && !!c3 && !!c4 && !!c5 && !!u1 && !!u2 && !!u3 && !!u4 && !!u5) {
          setImages({
            c1, c2, c3, c4, c5, u1, u2, u3, u4, u5
          })
        } else {
          console.log("bad data", data)
        }
      }
    }).catch(function (error) {
      console.log(error);
    }).finally(function () {
      if (!!queryTimer) {
        clearTimeout(queryTimer)
      }
      queryTimer = setTimeout(() => {
        queryImages()
      }, 1000)
    });

  }

  useEffect(() => {
    queryImages()
    return () => {
      if (!!queryTimer) {
        clearTimeout(queryTimer)
      }
    }
  }, [])

  // useEffect(() => {
  //   let startTime, lastTime;
  //   let interval = 1000 / 10;
  //   lastTime = -interval;
  //
  //   const fac1 = new FastAverageColor()
  //   const fac2 = new FastAverageColor()
  //   const fac3 = new FastAverageColor()
  //   const fac4 = new FastAverageColor()
  //   const fac5 = new FastAverageColor()
  //   fac1.getColorAsync('./1.jpg')
  //     .then(color => {
  //       console.log("COLOR1", color.value)
  //       setColor1([color.value[0] / 255, color.value[1] / 255, color.value[2] / 255])
  //     }).catch(e => {
  //   });
  //
  //   fac2.getColorAsync('./2.jpg')
  //     .then(color => {
  //       console.log("COLOR2", color.value)
  //       setColor2([color.value[0] / 255, color.value[1] / 255, color.value[2] / 255])
  //     }).catch(e => {
  //   });
  //
  //   fac3.getColorAsync('./3.jpg')
  //     .then(color => {
  //       console.log("COLOR3", color.value)
  //       setColor3([color.value[0] / 255, color.value[1] / 255, color.value[2] / 255])
  //     }).catch(e => {
  //   });
  //
  //   fac4.getColorAsync('./4.jpg')
  //     .then(color => {
  //       console.log("COLOR4", color.value)
  //       setColor4([color.value[0] / 255, color.value[1] / 255, color.value[2] / 255])
  //     }).catch(e => {
  //   });
  //
  //   fac5.getColorAsync('./5.png')
  //     .then(color => {
  //       console.log("COLOR5", color.value)
  //       setColor5([color.value[0] / 255, color.value[1] / 255, color.value[2] / 255])
  //     }).catch(e => {
  //   });
  //
  //   // console.log(fac1)
  //
  //
  //   // function loop(t) {
  //   //   af = requestAnimationFrame(loop);
  //   //   if (!startTime) startTime = t;
  //   //   if (t - lastTime > interval) {
  //   //     lastTime = t;
  //   //     // setITime(t - startTime);
  //   //   }
  //   // }
  //   //
  //   // requestAnimationFrame(loop);
  //   // return () => {
  //   //   cancelAnimationFrame(af);
  //   // };
  // }, []);
  // if (!color1 || !color2 || !color3 || !color4 || !color5) {
  //   return null
  // }

  if (!images) {
    return null
  }

  let widthRatio = 1.0; // width / height / (1336.0 / 700.0);
  return (
    <div className={'AnimatedBackground'}>
      <div className={"Colors"}>
        <div
          style={{backgroundColor: `rgb(${Math.floor(images.c1[0] * 255)}, ${Math.floor(images.c1[1] * 255)}, ${Math.floor(images.c1[2] * 255)})`}}></div>
        <div
          style={{backgroundColor: `rgb(${Math.floor(images.c2[0] * 255)}, ${Math.floor(images.c2[1] * 255)}, ${Math.floor(images.c2[2] * 255)})`}}></div>
        <div
          style={{backgroundColor: `rgb(${Math.floor(images.c3[0] * 255)}, ${Math.floor(images.c3[1] * 255)}, ${Math.floor(images.c3[2] * 255)})`}}></div>
        <div
          style={{backgroundColor: `rgb(${Math.floor(images.c4[0] * 255)}, ${Math.floor(images.c4[1] * 255)}, ${Math.floor(images.c4[2] * 255)})`}}></div>
        <div
          style={{backgroundColor: `rgb(${Math.floor(images.c5[0] * 255)}, ${Math.floor(images.c5[1] * 255)}, ${Math.floor(images.c5[2] * 255)})`}}></div>
      </div>
      <Surface
        width={800}
        height={800}
        // pixelRatio={window.devicePixelRatio}
        pixelRatio={1}
        version={"webgl2"}
      >
        <AddBiliner>
          <AddColor
            uniforms={{
              color1: images.c1,
              color2: images.c2,
              color3: images.c3,
              color4: images.c4,
              color5: images.c5,
            }}
          >
            <AddNoise>
              <Node shader={shaders.Merge5To1}
                    uniforms={{
                      iTime: 0,
                      t1: images.u1,
                      t2: images.u2,
                      t3: images.u3,
                      t4: images.u4,
                      t5: images.u5,
                    }}
              />
              <Node shader={shaders.PerlinNoise}
                    uniforms={{}}/>
            </AddNoise>
          </AddColor>
        </AddBiliner>
      </Surface>
    </div>
  );
}

export default AnimatedBackground;
