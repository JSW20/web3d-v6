/*ui.js - AppUI
   
   thhis is the main controller for my user interface

itt loads product data from JSON using fetch(), handles all button clicks, 
manages the audio (using Web Audio API), runs the render loop, and shows/hides the video panel
   
  i used the IIFE module pattern here too so it fits with the MVC structure i used throughout the project.
   
the audio was inspired by what was covered in Lab 5 in February, but I took it further by making the sounds using the Web Audio API
rather than using pre-recorded audio files.*/

   'use strict';

   const AppUI = (() => {
   
     /*toast notificaitons
        ssmall popup messages at the bottom of the screen.
        
        i used var instead of let here because the function is called early in the boot sequence 
        before the variable declaration line is reached*/
     var _toastTimer;
   
     function showToast(msg) {
       const el = document.getElementById('toast');
       el.textContent = msg;
       el.classList.add('show');
       clearTimeout(_toastTimer);
       _toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
     }
   
     /* Show or hide the loading spinner while a GLB is being fetched */
     function setViewportLoading(on) {
       const ring = document.querySelector('.model-loading-ring');
       if (ring) ring.classList.toggle('hide', !on);
     }
   
     /*to pdate specs panel w/ selected product's data from JSON */
     function updateSpecs(product) {
       document.getElementById('specs-content').innerHTML =
         product.specs.map(s =>
           `<div class="spec-row"><span class="spec-key">${s[0]}</span><span class="spec-val">${s[1]}</span></div>`
         ).join('');
   
        //to update canvas-generated thumbnail image
       const imgEl = document.getElementById('product-thumb');
       if (imgEl) imgEl.src = generateProductImage(product.id);
   
    //to update product description text
       const descEl = document.getElementById('product-desc');
       if (descEl) descEl.textContent = product.description || '';
     }
   
  /*oproduct thumbnails (HTML5 canvas API)
        i used the Canvas 2D API to draw a simple line illustration of each product it gets converted to a data URL with toDataURL() and set as the src of an img element in the specs panel.
        
      this means i don't need any image files for these thumbnails*/

     function generateProductImage(id) {
       const cv = document.createElement('canvas');
       cv.width = 160; cv.height = 90;
       const c = cv.getContext('2d');
   
       //ii made a dark background with grid
       const bg = c.createLinearGradient(0, 0, 160, 90);
       bg.addColorStop(0, '#1a2038'); bg.addColorStop(1, '#0e1525');
       c.fillStyle = bg; c.fillRect(0, 0, 160, 90);
       c.strokeStyle = 'rgba(74,158,255,0.07)'; c.lineWidth = 0.5;
       for (let x = 0; x < 160; x += 16) { c.beginPath(); c.moveTo(x,0); c.lineTo(x,90); c.stroke(); }
       for (let y = 0; y < 90;  y += 16) { c.beginPath(); c.moveTo(0,y); c.lineTo(160,y); c.stroke(); }
   
       c.fillStyle   = 'rgba(74,158,255,0.18)';
       c.strokeStyle = 'rgba(74,158,255,0.75)';
       c.lineWidth   = 1.5;
       c.lineJoin    = 'round';
   
       const rr = (x, y, w, h, r) => {
         c.beginPath();
         c.moveTo(x+r, y); c.lineTo(x+w-r, y);
         c.quadraticCurveTo(x+w,y, x+w,y+r);
         c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h, x+w-r,y+h);
         c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h, x,y+h-r);
         c.lineTo(x,y+r); c.quadraticCurveTo(x,y, x+r,y);
         c.closePath();
       };
   
       switch (id) {
         case 'laptop':
           rr(20, 50, 120, 28, 4); c.fill(); c.stroke();
           rr(30, 12, 100, 36, 4); c.fill(); c.stroke();
           c.fillStyle = 'rgba(74,158,255,0.25)';
           rr(33, 15, 94, 30, 3); c.fill();
           break;
         case 'vfold':
           rr(55, 48, 50, 34, 6); c.fill(); c.stroke();
           rr(55, 10, 50, 34, 6); c.fill(); c.stroke();
           c.strokeStyle = 'rgba(74,158,255,1)';
           c.beginPath(); c.moveTo(55,46); c.lineTo(105,46); c.stroke();
           break;
         case 'earbuds':
           rr(35, 12, 90, 66, 18); c.fill(); c.stroke();
           c.fillStyle = 'rgba(74,158,255,0.3)';
           c.beginPath(); c.arc(60, 52, 13, 0, Math.PI*2); c.fill(); c.stroke();
           c.beginPath(); c.arc(100, 52, 13, 0, Math.PI*2); c.fill(); c.stroke();
           c.fillStyle = 'rgba(0,220,120,0.9)';
           c.beginPath(); c.arc(80, 20, 3, 0, Math.PI*2); c.fill();
           break;
         case 'hfold':
           rr(12, 12, 60, 66, 5); c.fill(); c.stroke();
           rr(78, 12, 60, 66, 5); c.fill(); c.stroke();
           c.strokeStyle = 'rgba(74,158,255,1)'; c.lineWidth = 2;
           c.beginPath(); c.moveTo(74,12); c.lineTo(74,78); c.stroke();
           c.fillStyle = 'rgba(74,158,255,0.6)';
           [0,-14,14].forEach(oy => {
             c.beginPath(); c.arc(108, 28+oy, 4, 0, Math.PI*2); c.fill();
           });
           break;
       }
   
       return cv.toDataURL('image/png');
     }
   

     /*web audio API
      i used the web audio API to create all the soundsit was inspired by the audio work in Lab 5 in February 

       but i generated all sounds from oscillators rather than loading audio files

 rthis avoids needing any extra files
        
        ia added 3 sounds:
          -ambient background
        - whoosh sound when animate is clicked
          -a soft click when switching between products*/
     let audioCtx    = null;
     let ambientOsc  = null;
     let ambientGain = null;
     let audioEnabled = false;
   
     function getAudioCtx() {
       if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
       return audioCtx;
     }
   
     function startAmbient() {
       const ctx = getAudioCtx();
       if (ambientOsc) return;
   
       ambientGain = ctx.createGain();
       ambientGain.gain.setValueAtTime(0, ctx.currentTime);
       ambientGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 1.2);//fade in slowly
       ambientGain.connect(ctx.destination);

       [55, 82.5].forEach(freq => {
         const osc = ctx.createOscillator();
         const flt = ctx.createBiquadFilter();
         osc.type = 'sine';
         osc.frequency.value = freq;
         flt.type = 'lowpass';
         flt.frequency.value = 180;
         osc.connect(flt);
         flt.connect(ambientGain);
         osc.start();
       });
       ambientOsc = true;
     }

   
     function stopAmbient() {
       if (!ambientGain) return;
       const ctx = getAudioCtx();
       ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
       setTimeout(() => {
         if (ambientGain) { try { ambientGain.disconnect(); } catch(e){} }
         ambientGain = null;
         ambientOsc  = null;
       }, 900);
     }
   

/*awhoosh sound plays when animate is clicked*/
     function playAnimSound() {
       if (!audioEnabled) return;
       const ctx  = getAudioCtx();
       const osc  = ctx.createOscillator();
       const gain = ctx.createGain();
       const flt  = ctx.createBiquadFilter();
       osc.type = 'sawtooth';
       osc.frequency.setValueAtTime(380, ctx.currentTime);
       osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.35);
       flt.type = 'lowpass'; flt.frequency.value = 900;
       gain.gain.setValueAtTime(0.12, ctx.currentTime);
       gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.36);
       osc.connect(flt); flt.connect(gain); gain.connect(ctx.destination);
       osc.start(); osc.stop(ctx.currentTime + 0.38);
     }
   

     /*csoft click sound when switching products*/
     function playClickSound() {
       if (!audioEnabled) return;
       const ctx  = getAudioCtx();
       const osc  = ctx.createOscillator();
       const gain = ctx.createGain();
       osc.type = 'sine'; osc.frequency.value = 660;
       gain.gain.setValueAtTime(0.08, ctx.currentTime);
       gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
       osc.connect(gain); gain.connect(ctx.destination);
       osc.start(); osc.stop(ctx.currentTime + 0.14);
     }
   
     function toggleAudio() {
       audioEnabled = !audioEnabled;
       const btn = document.getElementById('btn-audio');
       if (audioEnabled) {
         startAmbient();
         btn.classList.add('audio-on');
         btn.querySelector('span').textContent = 'AUDIO ON';
         showToast('Ambient audio on');
       } else {
         stopAmbient();
         btn.classList.remove('audio-on');
         btn.querySelector('span').textContent = 'AUDIO OFF';
         showToast('Ambient audio off');
       }
     }
   

        /*viideo panel:
       when the video button is clicked I show an overlay panel with a HTML5 <video> element. 
         the video source comes from the products.json data that was loaded via fetch() at startup.
   if the video file doesnt exist the browser just shows nothing in the video element, which is fine*/
     let videoOpen = false;
   
     function toggleVideo() {
       videoOpen = !videoOpen;
       const panel = document.getElementById('video-panel');
       const btn   = document.getElementById('btn-video');
       panel.classList.toggle('hidden', !videoOpen);
       btn.classList.toggle('on', videoOpen);
       if (videoOpen) {
         updateVideoSource();
       } else {
         const vid = document.getElementById('product-video');
         if (vid) vid.pause();
       }
     }
   
     function updateVideoSource() {
       if (!videoOpen || !window.PRODUCTS) return;
       const p   = window.PRODUCTS[AppModels.currentProductIdx];
       if (!p) return;
       const vid = document.getElementById('product-video');
       const ttl = document.getElementById('video-title');
       const sub = document.getElementById('video-sub');
       if (ttl) ttl.textContent = p.name;
       if (sub) sub.textContent = p.description || '';
       if (vid) {
         vid.src = p.video || '';
         vid.load();
       }
     }

   
     /*if a sidebar card is clicked this function:
      -updates the overlay text (product name, tag)
        - updates the specs panel from JSON data
    - shows the loading spinner
      - calls loadModel() from models.js which returns a promise
       - on resolve it adds the model to the scene and hides the spinner*/
     function selectProduct(idx) {
       if (idx === AppModels.currentProductIdx) return;
       const p = window.PRODUCTS[idx];
   
       document.querySelectorAll('.p-card').forEach((el, i) =>
         el.classList.toggle('active', i === idx));
       document.getElementById('ov-num').textContent  = p.num;
       document.getElementById('ov-name').textContent = p.name;
       document.getElementById('ov-tag').textContent  = p.tag;
       updateSpecs(p);
   
       if (videoOpen) updateVideoSource();
   
       setViewportLoading(true);
       playClickSound();
   
       AppModels.loadModel(p)
         .then(group => {
           AppModels.setModel(group, idx);
           setViewportLoading(false);
           showToast(p.name + ' loaded');
         })
         .catch(err => {
           setViewportLoading(false);
           console.error('Failed to load:', p.file, err);
           showToast('Could not load ' + p.name + ' - check models/ folder');
         });
     }

   
     /*switch to between products page and about page*/
     function showPage(page) {
       document.getElementById('products-page').classList.toggle('hidden', page !== 'products');
       document.getElementById('about-page').classList.toggle('hidden', page !== 'about');
       document.getElementById('btn-nav-products').classList.toggle('active', page === 'products');
       document.getElementById('btn-nav-about').classList.toggle('active', page === 'about');
       if (page === 'products') window.dispatchEvent(new Event('resize'));
     }
   

/*bnutton handler functions*/

     function toggleAnimation()  { AppModels.toggleAnimation(); }
     function toggleWireframe()  { AppModels.toggleWireframe(); }
     function toggleSpotlight()  { AppScene.toggleSpotlight(); }
     function toggleRim()        { AppScene.toggleRim(); }
     function cycleRimColour()   { AppScene.cycleRimColour(); }
   
     function cycleLighting() {
       AppScene.lightPresetIdx = (AppScene.lightPresetIdx + 1) % AppScene.LIGHT_NAMES.length;
       AppScene.applyLightPreset(AppScene.lightPresetIdx);
       document.getElementById('light-label').textContent = AppScene.LIGHT_NAMES[AppScene.lightPresetIdx];
       showToast('Lighting: ' + AppScene.LIGHT_NAMES[AppScene.lightPresetIdx]);
     }
   
     function toggleAutoSpin() {
       AppScene.controls.autoRotate = !AppScene.controls.autoRotate;
       document.getElementById('btn-spin').classList.toggle('on', AppScene.controls.autoRotate);
       showToast(AppScene.controls.autoRotate ? 'Auto-spin ON' : 'Auto-spin OFF');
     }
   
     function setCameraPreset(n) {
       AppScene.setCameraPreset(n);
       showToast('Camera: ' + n.charAt(0).toUpperCase() + n.slice(1));
     }
   

  /*rRendering:
   - requestAnimationFrame runs this every frame.
-  I call update() in models.js first which returns the delta time, then pass that to scene.js update() for the camera animation, then render the scene. */
     function startRenderLoop() {
       (function loop() {
         requestAnimationFrame(loop);
         const delta = AppModels.update();
         AppScene.update(delta);
         AppScene.renderer.render(AppScene.scene, AppScene.camera);
       })();
     }
   

 /*Bboot via fetch()/AJAX
- I load the product data from products.json using fetch() before starting the app. 
 -  This means the product names, specs, colours and video paths are all in a JSON file rather than hardcoded in the JavaScript. 
- this satisfies the AJAX/JSON requirement.
  - the JSON data is stored in window.PRODUCTS once loaded.*/

     function loadProductData() {
       return fetch('data/products.json')
         .then(res => {
           if (!res.ok) throw new Error('HTTP ' + res.status);
           return res.json();
         })
         .then(data => {
           window.PRODUCTS = data.products;
         })
         .catch(err => {
           console.error('Could not load products.json:', err);
           showToast('Warning: product data failed to load');
         });
     }
   
     function init() {
       startRenderLoop();
       loadProductData().then(() => {
         selectProduct(0); //load the 1st product
         //then hide loading screen
         setTimeout(() => {
           const ld = document.getElementById('loading');
           ld.classList.add('fade');
           setTimeout(() => { ld.style.display = 'none'; }, 700);
         }, 400);
       });
     }
   

//puublic API

return {
       init,
       showToast,
       playAnimSound,
       selectProduct,
       showPage,
       toggleAnimation,
       toggleWireframe,
       toggleAudio,
       toggleSpotlight,
       toggleVideo,
       toggleRim,
       cycleRimColour,
       setCameraPreset,
       cycleLighting,
       toggleAutoSpin,
       generateProductImage
     };
   })();
   
   function selectProduct(idx)  { AppUI.selectProduct(idx); }
   function showPage(page)      { AppUI.showPage(page); }
   function toggleAnimation()   { AppUI.toggleAnimation(); }
   function toggleWireframe()   { AppUI.toggleWireframe(); }
   function cycleLighting()     { AppUI.cycleLighting(); }
   function toggleAutoSpin()    { AppUI.toggleAutoSpin(); }
   function toggleAudio()       { AppUI.toggleAudio(); }
   function toggleSpotlight()   { AppUI.toggleSpotlight(); }
   function toggleVideo()       { AppUI.toggleVideo(); }
   function setCameraPreset(n)  { AppUI.setCameraPreset(n); }
   function toggleRim()         { AppUI.toggleRim(); }
   function cycleRimColour()    { AppUI.cycleRimColour(); }
   
   document.addEventListener('DOMContentLoaded', () => AppUI.init());