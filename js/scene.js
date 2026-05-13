/*scene.js - AppScene
   
this file handles everything to do with the Three.js scene - the renderer, camera, lighting, and the GLSL shader i wrote

   i put it all in an IIFE so nothing leaks into the global scope,
    which is the MVC pattern i learned about in the module resources.
   
   i built on what was covered in Lab 4 in February (setting up the scene, camera and renderer) and Lab 5 in February (lighting)
   the GLSL shader is something I added myself beyond the labs*/

   'use strict';

   const AppScene = (() => {
   

     /*renderer
   
     i'm targeting the canvas element that's already in my HTML

        i set antialiasing to true so the edges of the models dont look jagged
        
  the pixel ratio is capped at 2 so it doesnt run too slow on high-DPI screens

      ACES filmic tone mapping makes my colours look more realistic

         sRGB encoding is needed for correct colour output in WebGL*/

     const canvas = document.getElementById('canvas3d');
     const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
     renderer.outputEncoding      = THREE.sRGBEncoding;
     renderer.toneMapping         = THREE.ACESFilmicToneMapping;
     renderer.toneMappingExposure = 1.55;
     renderer.shadowMap.enabled   = true;
     renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
   

     /*scene:
  the background colour matches the CSS body background so there is no visible seam between the canvas and the page

        i added exponential fog so the grid floor fades out in the distance rather than having a hard edge*/

     const scene = new THREE.Scene();
     scene.background = new THREE.Color(0x1e2438);
     scene.fog = new THREE.FogExp2(0x1e2438, 0.07);
   

     /*camera:
        using a camera with a 42 degree FOV

   i set the near clipping plane very small (0.01) so the camera can get close to models without them disappearing*/

     const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
     camera.position.set(0, 1.1, 4.8);
   

     /*orbit controls:
         i used OrbitControls from the Three.js examples library

  this was introduced in Lab 4 in February
        
      i added damping so the camera acts smoothly when you let go of the mouse*/

     const controls = new THREE.OrbitControls(camera, canvas);
     controls.enableDamping   = true;
     controls.dampingFactor   = 0.07;
     controls.minDistance     = 1.2;//stops user clipping inside the model
     controls.maxDistance     = 12;//stops user losing the model
     controls.maxPolarAngle   = Math.PI * 0.87;
     controls.autoRotate      = false;
     controls.autoRotateSpeed = 1.4;
   

     /*grid floor:
for me this was just a visual reference so the models dont look like they are floating in empty space
        
        (positioned below the model origin)
        */
        
     const grid = new THREE.GridHelper(20, 40, 0x2a3555, 0x1e2a44);
     grid.position.y = -1.6;
     scene.add(grid);
   

     /*lights:
 i set up several lights based on what was covered in Lab 5 in February
       
       i used a key light (dirKey) as the main light source with shadows, 
       
  a fill light (dirFill) from the opposite side to stop the shadow areas going completely black,
      
    and ambient light to make sure nothing is invisible.
        
      the point lights (ptCyan, ptMagenta, ptGreen) are only used in the Neon preset

      the hemisphere light is only used for Daylight
        
        i set all their intensities to 0 initially and switch them on in the applyLightPreset function*/

     const ambLight  = new THREE.AmbientLight(0xffffff, 0.75);
     const dirKey    = new THREE.DirectionalLight(0xffffff, 1.8);
     const dirFill   = new THREE.DirectionalLight(0x6699ff, 0.65);
     const ptCyan    = new THREE.PointLight(0x00ffff, 0, 9);
     const ptMagenta = new THREE.PointLight(0xff00ff, 0, 9);
     const ptGreen   = new THREE.PointLight(0x44ff88, 0, 9);
     const hemLight  = new THREE.HemisphereLight(0x87ceeb, 0x4a7c59, 0);
   
     dirKey.position.set(5, 8, 5);
     dirKey.castShadow = true;
     dirKey.shadow.mapSize.set(1024, 1024);
     dirFill.position.set(-5, 3, -5);
     ptCyan.position.set(3, 3, 3);
     ptMagenta.position.set(-3, 2, -3);
     ptGreen.position.set(0, -2, 4);
   
     scene.add(ambLight, dirKey, dirFill, ptCyan, ptMagenta, ptGreen, hemLight);
   
     /*spotlight:
    i added a spotlight as an extra light that the user can toggle separately from the main lighting presets
        
        it points straight down at the model from above

    it starts with intensity 0 (off) and only turns on when the user clicks the spotlight button*/

     const spotlight = new THREE.SpotLight(0xfff8e8, 0, 12, Math.PI / 7, 0.28, 1.4);
     spotlight.position.set(0, 5.5, 2.5);
     spotlight.castShadow = true;
     spotlight.shadow.mapSize.set(512, 512);
     scene.add(spotlight);
     scene.add(spotlight.target);//target is at origin so the light points at the model
     let spotlightOn = false;

   
     /*lighting presets:

    3 presets the user can cycle through with a button

        i zeroed all light intensities first each time so there is no bleed between presets
        
  this approach came from the lighting GUI I worked on in Lab 5 in February*/

     const LIGHT_NAMES = ['STUDIO', 'NEON', 'DAYLIGHT'];
     let lightPresetIdx = 0;
   
     function applyLightPreset(i) {
       //zero everything first
       [ambLight, dirKey, dirFill, ptCyan, ptMagenta, ptGreen, hemLight]
         .forEach(l => { l.intensity = 0; });
   
       switch (i) {
         case 0: //studio
           ambLight.color.set(0xffffff); ambLight.intensity = 0.75;
           dirKey.color.set(0xffffff);   dirKey.intensity   = 1.8;
           dirKey.position.set(5, 8, 5);
           dirFill.color.set(0x6699ff);  dirFill.intensity  = 0.65;
           break;
   
         case 1: //neon
           ambLight.color.set(0x101828); ambLight.intensity = 0.35;
           ptCyan.intensity    = 3.5;
           ptMagenta.intensity = 3.5;
           ptGreen.intensity   = 2.2;
           break;
   
         case 2: //daylight
           ambLight.color.set(0xfff4e8); ambLight.intensity = 0.85;
           dirKey.color.set(0xfffce0);   dirKey.intensity   = 2.0;
           dirKey.position.set(8, 14, 5);
           hemLight.intensity = 0.75;
           break;
       }
     }
     applyLightPreset(0); //start on studio lighting
   
     function toggleSpotlight() {
       spotlightOn = !spotlightOn;
       spotlight.intensity = spotlightOn ? 3.5 : 0;
       document.getElementById('btn-spot').classList.toggle('spot-on', spotlightOn);
       AppUI.showToast(spotlightOn ? 'Spotlight ON' : 'Spotlight OFF');
     }

   
     /*camera presets:
  4 camera positions the user can jump to
        each has a position and a target (what the camera looks at)
    the actual movement is done as a smooth animation in update()
    */

     const CAM_PRESETS = {
       persp: { pos: [0,    1.1,  4.8], tgt: [0, 0, 0] },//default 3/4 view
       front: { pos: [0,    0.4,  5.2], tgt: [0, 0, 0] },
       side:  { pos: [5.2,  0.6,  0  ], tgt: [0, 0, 0] },
       top:   { pos: [0,    6.0,  0.5], tgt: [0, 0, 0] },
     };
   
     let camAnim = null;
   
     function setCameraPreset(name) {
       const p = CAM_PRESETS[name];
       if (!p) return;
       camAnim = {
         fromPos:    camera.position.clone(),
         toPos:      new THREE.Vector3(...p.pos),
         fromTarget: controls.target.clone(),
         toTarget:   new THREE.Vector3(...p.tgt),
         t: 0
       };
       controls.autoRotate = false;
       document.getElementById('btn-spin').classList.remove('on');
     }
   

     /*GLSL and rim shader:

        this is a custom shader i wrote in GLSL

creates a glowing rim/halo around the active model
    
    the effect works by rendering a slightly larger invisible sphere around the model,
  and using the angle between the surface normal and the camera direction to decide how bright each pixel should be
        
    
       my 2 GLSL shaders:
          - vertex runs once per vertex on the GPU and calculates the surface normal and view direction
       - fragment runs once per pixel and uses those values to compute the rim glow intensity
          
          */
   


     /*vertex shader: */

     const rimVertexShader = `
       varying vec3 vNormal;
       varying vec3 vViewDir;
   
       void main() {
         /* normalMatrix is the inverse-transpose of modelViewMatrix.
            This correctly transforms normals even with non-uniform scaling. */
         vNormal = normalize(normalMatrix * normal);
   
         /* position in view (camera) space */
         vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
   
         /* view direction: from vertex toward camera origin */
         vViewDir = normalize(-mvPosition.xyz);
   
         /* standard MVP transform */
         gl_Position = projectionMatrix * mvPosition;
       }
     `;
   

     /*fragment shader:*/

     const rimFragmentShader = `
       uniform vec3  uRimColor;
       uniform float uRimPower;
       uniform float uRimStrength;
   
       varying vec3 vNormal;
       varying vec3 vViewDir;
   
       void main() {
         /* dot(N, V) = 1.0 when surface faces camera, 0.0 at the edge.
            Clamping to [0,1] removes negative values (back faces). */
         float NdotV = clamp(dot(vNormal, vViewDir), 0.0, 1.0);
   
         /* invert so edges are bright, centre is dark */
         float rim = pow(1.0 - NdotV, uRimPower);
   
         vec3 colour = uRimColor * rim * uRimStrength;
   
         gl_FragColor = vec4(colour, rim * uRimStrength * 0.85);
       }
     `;
   

     /*create the ShaderMaterial using my GLSL shaders
        
     BackSide renders the inside of the sphere so the glow appears around the outside of the model rather than on top of it
  */

     const rimMaterial = new THREE.ShaderMaterial({
       vertexShader:   rimVertexShader,
       fragmentShader: rimFragmentShader,
       uniforms: {
         uRimColor:    { value: new THREE.Color(0x4a9eff) },
         uRimPower:    { value: 2.8 },
         uRimStrength: { value: 0.9 },
       },
       transparent:  true,
       blending:     THREE.AdditiveBlending,
       side:         THREE.BackSide,
       depthWrite:   false,
     });
   
     const rimGeo  = new THREE.SphereGeometry(1, 32, 24);
     const rimMesh = new THREE.Mesh(rimGeo, rimMaterial);
     rimMesh.visible = false;
     scene.add(rimMesh);
   
     let rimOn = false;
   

     /*updateRimShell is called from models.js every time a new model loads

        (uses the sphere of the model and scales the rim mesh to fit just outside it*/

     function updateRimShell(modelGroup) {
       if (!modelGroup) { rimMesh.visible = false; return; }
   
       const box = new THREE.Box3().setFromObject(modelGroup);
       const sphere = new THREE.Sphere();
       box.getBoundingSphere(sphere);
   
       const s = sphere.radius * 1.08; //making it larger than the model
       rimMesh.scale.setScalar(s);
       rimMesh.position.copy(sphere.center);
   
       rimMesh.visible = rimOn;
     }
   
     function toggleRim() {
       rimOn = !rimOn;
       rimMesh.visible = rimOn;
       document.getElementById('btn-rim').classList.toggle('on', rimOn);
       AppUI.showToast(rimOn ? 'Rim shader ON' : 'Rim shader OFF');
     }

   
  /*5 colour options for the rim glow
        
     - changing the uRimColor uniform updates the colour on the GPU
        */

     const RIM_COLOURS = [
       { label: 'Blue',    hex: 0x4a9eff },
       { label: 'Cyan',    hex: 0x00e5ff },
       { label: 'Magenta', hex: 0xff00cc },
       { label: 'Gold',    hex: 0xf5c842 },
       { label: 'Green',   hex: 0x00ff88 },
     ];
     let rimColourIdx = 0;
   
     function cycleRimColour() {
       rimColourIdx = (rimColourIdx + 1) % RIM_COLOURS.length;
       const c = RIM_COLOURS[rimColourIdx];
       rimMaterial.uniforms.uRimColor.value.setHex(c.hex);
       AppUI.showToast('Rim: ' + c.label);
     }
   

  /*resize handler
        
  
    (keeps the canvas at the right size when the window resizes)
    */

     function onResize() {
       const w = canvas.clientWidth, h = canvas.clientHeight;
       if (!w || !h) return;
       renderer.setSize(w, h, false);
       camera.aspect = w / h;
       camera.updateProjectionMatrix();
     }
     new ResizeObserver(onResize).observe(canvas);
     onResize();

   
     function update(delta) {
       if (camAnim) {
         camAnim.t = Math.min(camAnim.t + delta * 2.2, 1);
         const ease = 1 - Math.pow(1 - camAnim.t, 3);
         camera.position.lerpVectors(camAnim.fromPos, camAnim.toPos, ease);
         controls.target.lerpVectors(camAnim.fromTarget, camAnim.toTarget, ease);
         if (camAnim.t >= 1) camAnim = null;
       }
       controls.update();
     }
   

  //public API
     return {
       renderer,
       scene,
       camera,
       controls,
       LIGHT_NAMES,
       get lightPresetIdx() { return lightPresetIdx; },
       set lightPresetIdx(v) { lightPresetIdx = v; },
       applyLightPreset,
       toggleSpotlight,
       setCameraPreset,
       updateRimShell,
       toggleRim,
       cycleRimColour,
       update
     };
   })();