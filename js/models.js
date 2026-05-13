/*models.js - AppModels
   
  handles loading and displaying the 3D models

   i put everything in an IIFE so it doesnt pollute the global scope - following the MVC module pattern from the module resources
   
it covers:
   - loading GLB files using GLTFLoader (Lab 4 in February),
   - the open/close animations (Lab 5 in February introduced animation concepts), 
   - wireframe toggling (Lab 5)
   - my colour variant system
   */


   'use strict';

   const AppModels = (() => {
   

     //i use GLTFLoader to load the .glb files I exported from Blender
     const loader = new THREE.GLTFLoader();
   
     
     /*state variables: i cache loaded models so the same GLB file doesnt get downloaded more than once when the user switches products*/
     const cache             = {};
     const origColours       = new Map();
     let   currentModel      = null;
     let   currentProductIdx = -1;
     let   wireframeOn       = false;
     let   animProg          = 1;    //1.0 is open and 0.0 is closed
     let   animTarget        = 1;
     let   isAnimating       = false;
   

     /*the pivot group names i used in Blender
        when i exported the models to GLB, Blender preserved the object names, 
        so i can find the pivot using traverse() and its name


        the order matches the product array in products.json:

          0 = Laptop Pro is ScreenPivot
          1 = Flip Phone is TopPivot
          2 = EarPods Pro is LidPivot
          3 = Fold Phone is LeftPivot 
        */

     const PIVOT_NAMES = ['ScreenPivot', 'TopPivot', 'LidPivot', 'LeftPivot'];
   

  /*open and closed rotation values for each model
        i worked out these angles by trying different values in the browser and picking what looked right for each product

        THREE.Euler stores angles as (x, y, z)
        */

     const ANIM_OPEN = [
       new THREE.Euler(-0.28,         0, 0),//laptop: lid open at 110 degrees
       new THREE.Euler(0,              0, 0),//flip phone: top half fully open
       new THREE.Euler(-Math.PI*0.62,  0, 0),//earpods: lid at  112 degrees
       new THREE.Euler(0,              0, 0),//fold phone: left panel  flat
     ];
   
     const ANIM_CLOSED = [
       new THREE.Euler(Math.PI*0.52,  0, 0),//laptop: lid closed flat
       new THREE.Euler(Math.PI*0.93,  0, 0),//flip phone: top folded down
       new THREE.Euler(0,              0, 0),//earpods: lid closed
       new THREE.Euler(0, Math.PI*0.95, 0),//fold phone: left panel folded closed
     ];
   

     
    /*used to find the pivot groups by their Blender names*/
    
    function findByName(root, name) {
       let found = null;
       root.traverse(o => {
         if (o.name === name) found = o;
       });
       return found;
     }
   
     /*store the original colour of each material when the model first loads
     
     this lets me restore the colour before applying a new colour variant
      
        */
     
        function captureOriginals(model) {
       model.traverse(obj => {
         if (!obj.isMesh || !obj.material) return;
   
         const mats = Array.isArray(obj.material)
           ? obj.material
           : [obj.material];
   
         mats.forEach(m => {
           if (m.color && !origColours.has(m.uuid)) {
             origColours.set(m.uuid, m.color.clone());
           }
         });
       });
     }

   
     /*apply a colour variant to the current model

        i read the hex colour from products.json (loaded via fetch in ui.js)

        */


     function applyColour(variantIdx) {
       if (!currentModel || currentProductIdx < 0) return;
   
       const p = window.PRODUCTS[currentProductIdx];
       if (!p || !p.colours || !p.colours[variantIdx]) return;
   
       const v = p.colours[variantIdx];
       const tintColor = new THREE.Color(v.hex);
   
       currentModel.traverse(obj => {
         if (!obj.isMesh || !obj.material) return;
   
         const mats = Array.isArray(obj.material)
           ? obj.material
           : [obj.material];
   
         mats.forEach(m => {
           const orig = origColours.get(m.uuid);
   
           if (!orig || !m.color) return;
   


           const hasRealEmissive =
             m.emissive &&
             (m.emissive.r + m.emissive.g + m.emissive.b) > 0.05;
   
           if (hasRealEmissive) return;
   
           m.color.copy(orig).lerp(tintColor, 0.72);
   

           //forces Three.js to refresh material

           m.needsUpdate = true;
         });
       });
   
       document.querySelectorAll('.swatch-btn').forEach((btn, i) => {
         btn.classList.toggle('active', i === variantIdx);
       });
   
       AppUI.showToast(v.label + ' finish applied');
     }
   

     /*build the colour swatch buttons from the JSON data:

        this runs every time a new product is selected so the correct colours show up for that product

        */

     function buildSwatches(productIdx) {
       const container = document.getElementById('colour-swatches');
       if (!container) return;
   
       const p       = window.PRODUCTS ? window.PRODUCTS[productIdx] : null;
       const colours = p ? (p.colours || []) : [];
   
       container.innerHTML = colours.map((v, i) =>
         `<button class="swatch-btn${i===0?' active':''}"
            onclick="AppModels.applyColour(${i})" title="${v.label}">
           <div class="swatch-dot" style="background:${v.hex}"></div>
           <span class="swatch-label">${v.label}</span>
         </button>`
       ).join('');
     }
   

     /*apply the current animation progress value (t) to the pivot

        t=0 means closed, t=1 means open
      
        */

     function applyAnim(t) {
       if (!currentModel || currentProductIdx < 0) return;
   
       const pivot = findByName(currentModel, PIVOT_NAMES[currentProductIdx]);
   
       if (!pivot) return;
   
       const open   = ANIM_OPEN[currentProductIdx];
       const closed = ANIM_CLOSED[currentProductIdx];
   
       pivot.rotation.x = THREE.MathUtils.lerp(closed.x, open.x, t);
       pivot.rotation.y = THREE.MathUtils.lerp(closed.y, open.y, t);
       pivot.rotation.z = THREE.MathUtils.lerp(closed.z, open.z, t);
     }

   
     /*load a GLB file using GLTFLoader

        if the model has already been loaded i return the cached version without making another request
        */

     function loadModel(product) {
       if (cache[product.id]) {
         return Promise.resolve(cache[product.id]);
       }
   
       return new Promise((resolve, reject) => {
         loader.load(
           product.file,
           (gltf) => {
             const root = gltf.scene;
   
             root.name = product.id;
   
 //turn on shadows for every mesh in the model
             root.traverse(obj => {
               if (obj.isMesh) {
                 obj.castShadow    = true;
                 obj.receiveShadow = true;
               }
             });
   
             captureOriginals(root);
   
             cache[product.id] = root;
   
             resolve(root);
           },
           null,
           reject
         );
       });
     }
   

  /*remove the old model and add the new one to the scene:
        
  resets all the UI state (wireframe, animation, camera) and tells scene.js to update the GLSL rim shader to fit this model
  
  */
     function setModel(group, productIdx) {
       if (currentModel) {
         if (wireframeOn) {
           applyWireframeToModel(currentModel, false);
         }
   
         AppScene.scene.remove(currentModel);
       }
   
       const p = window.PRODUCTS[productIdx];
   
       group.scale.setScalar(p.scale);
       group.position.set(0, p.offsetY, 0);
   
       AppScene.scene.add(group);
   
       currentModel      = group;
       currentProductIdx = productIdx;
       wireframeOn       = false;
   
       document.getElementById('btn-wire').classList.remove('on');
   
       //open state when a model first loads
       animProg = 1;
       animTarget = 1;
       isAnimating = false;
   
       applyAnim(1);
   
       AppScene.camera.position.set(0, 1.1, 4.8);
       AppScene.controls.target.set(0, 0, 0);
   
       buildSwatches(productIdx);
   
       AppScene.updateRimShell(group);
     }
   
     function applyWireframeToModel(model, on) {
       model.traverse(obj => {
         if (!obj.isMesh || !obj.material) return;
   
         const mats = Array.isArray(obj.material)
           ? obj.material
           : [obj.material];
   
         mats.forEach(m => {
           m.wireframe = on;
         });
       });
     }
   

     /*toggle wireframe mode - from Lab 5 in February
        traverses every mesh and flips the wireframe flag on all materials
        */

     function toggleWireframe() {
       if (!currentModel) return;
   
       wireframeOn = !wireframeOn;
   
       applyWireframeToModel(currentModel, wireframeOn);
   
       document.getElementById('btn-wire').classList.toggle('on', wireframeOn);
   
       AppUI.showToast(wireframeOn ? 'Wireframe ON' : 'Wireframe OFF');
     }
   

     /*trigger the open/close animation:
        
        flips the target between 0 and 1 depending on which direction it's going, 
        
        then the update() loop does the actual movemen

        plays the web audio API sound at the same time
        */

     function toggleAnimation() {
       animTarget  = animProg > 0.5 ? 0 : 1;
       isAnimating = true;
   
       AppUI.playAnimSound();
   
       const label = document.getElementById('anim-label');
       const btn   = document.getElementById('btn-anim');
   
       btn.classList.add('on');
   
       label.textContent =
         animTarget < 0.5 ? 'CLOSING...' : 'OPENING...';
   
       setTimeout(() => {
         btn.classList.remove('on');
         label.textContent = 'ANIMATE';
       }, 1600);
     }
   
     const clock = new THREE.Clock();
   
     function update() {
       const delta   = clock.getDelta();
       const elapsed = clock.getElapsedTime();
   
       //gentle up/down floating movement

       if (currentModel) {
         const base =
           window.PRODUCTS
             ? (window.PRODUCTS[currentProductIdx]?.offsetY ?? 0)
             : 0;
   
         currentModel.position.y =
           base + Math.sin(elapsed * 0.68) * 0.046;
       }
   
       if (isAnimating) {
         const diff = animTarget - animProg;
   
         if (Math.abs(diff) < 0.004) {
           animProg    = animTarget;
           isAnimating = false;
         } else {
           animProg = THREE.MathUtils.clamp(
             animProg + Math.sign(diff) * 0.85 * delta,
             0,
             1
           );
         }
   
         applyAnim(animProg);
       }
   
       return delta;
     }
   
     return {
       loadModel,
       setModel,
       toggleWireframe,
       toggleAnimation,
       applyColour,
       update,
   
       get currentProductIdx() {
         return currentProductIdx;
       },
   
       get currentModel() {
         return currentModel;
       }
     };
   
   })();