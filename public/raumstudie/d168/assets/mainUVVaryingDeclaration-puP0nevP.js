import{t as e}from"./shaderStore-D-XQlhUT.js";var t=`meshUboDeclaration`,n=`struct Mesh {world : mat4x4<f32>,
visibility : f32,};var<uniform> mesh : Mesh;
#define WORLD_UBO
`;e.IncludesShadersStoreWGSL[t]||(e.IncludesShadersStoreWGSL[t]=n);var r={name:t,shader:n},i=`mainUVVaryingDeclaration`,a=`#ifdef MAINUV{X}
varying vMainUV{X}: vec2f;
#endif
`;e.IncludesShadersStoreWGSL[i]||(e.IncludesShadersStoreWGSL[i]=a);var o={name:i,shader:a};export{r as n,o as t};