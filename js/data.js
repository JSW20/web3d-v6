/*data.js
   
   my data file just holds the file paths for my GLB models

   all the actual product data (names, specs, colours, etc.) is in data/products.json 
   which is loaded via fetch() in ui.js when my app starts
   
   i did this because the brief mentioned JSON and AJAX
   
   */


   'use strict';

/*GLB file paths - matches the filenames i exported from Blender*/
   const MODEL_FILES = {
     laptop:  'models/laptop-pro.glb',
     vfold:   'models/flip-phone-pro.glb',
     earbuds: 'models/earpods-pro.glb',
     hfold:   'models/fold-phone-pro.glb'
   };