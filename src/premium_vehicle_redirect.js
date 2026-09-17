import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

// Premium CC0 vehicle replacements from 3DAssets.dev.
// They are loaded directly from the provider CDN and automatically fall back
// to the original Kenney model if the premium asset cannot be loaded.
const PREMIUM_REPLACEMENTS = [
  {
    test: /\/sedan\.glb(?:[?#]|$)/i,
    url: 'https://cdn.3dassets.dev/assets/32487/v1/model.glb',
    name: 'City car'
  },
  {
    test: /\/hatchbackSports\.glb(?:[?#]|$)/i,
    url: 'https://cdn.3dassets.dev/assets/32493/v1/model.glb',
    name: 'Three-door hatchback'
  },
  {
    test: /\/(?:sedanSports|race|raceFuture)\.glb(?:[?#]|$)/i,
    url: 'https://cdn.3dassets.dev/assets/32495/v1/model.glb',
    name: 'Mid-engine sports car'
  }
];

if (!GLTFLoader.prototype.__karagamePremiumRedirect) {
  GLTFLoader.prototype.__karagamePremiumRedirect = true;
  const originalLoad = GLTFLoader.prototype.load;

  GLTFLoader.prototype.load = function(url, onLoad, onProgress, onError) {
    const replacement = PREMIUM_REPLACEMENTS.find(entry => entry.test.test(String(url)));
    if (!replacement) return originalLoad.call(this, url, onLoad, onProgress, onError);

    const loadOriginal = () => originalLoad.call(this, url, onLoad, onProgress, onError);

    return originalLoad.call(
      this,
      replacement.url,
      gltf => {
        // 3DAssets.dev vehicles are +Z forward. The existing normalizer rotates
        // Kenney assets by PI, so this inner wrapper compensates that rotation.
        const wrapper = new THREE.Group();
        gltf.scene.rotation.y = Math.PI;
        wrapper.add(gltf.scene);
        wrapper.userData.premiumVehicle = true;
        wrapper.userData.premiumVehicleName = replacement.name;
        gltf.scene = wrapper;
        onLoad?.(gltf);
      },
      onProgress,
      err => {
        console.warn(`Premium vehicle failed (${replacement.name}); using original asset.`, err);
        loadOriginal();
      }
    );
  };
}
