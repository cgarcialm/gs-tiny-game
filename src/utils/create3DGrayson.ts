import * as THREE from "three";

/**
 * Creates a 3D Grayson character
 * Returns the group and references to body parts for animation
 */
export function create3DGrayson() {
  const grayson = new THREE.Group();
  
  // Shoes/feet (dark brown)
  const shoeMat = new THREE.MeshStandardMaterial({ 
    color: 0x3e2723,
    emissive: 0x3e2723,
    emissiveIntensity: 0.2
  });
  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.3), shoeMat);
  leftShoe.position.set(-0.15, 0.08, 0);
  grayson.add(leftShoe);
  
  const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.3), shoeMat);
  rightShoe.position.set(0.15, 0.08, 0);
  grayson.add(rightShoe);
  
  // Legs (brown pants)
  const pantsMat = new THREE.MeshStandardMaterial({ 
    color: 0x6b4423,
    emissive: 0x6b4423,
    emissiveIntensity: 0.15
  });
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6), pantsMat);
  leftLeg.position.set(-0.15, 0.5, 0);
  grayson.add(leftLeg);
  
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6), pantsMat);
  rightLeg.position.set(0.15, 0.5, 0);
  grayson.add(rightLeg);
  
  // Torso (bright green shirt)
  const shirtMat = new THREE.MeshStandardMaterial({ 
    color: 0x81c784,
    emissive: 0x81c784,
    emissiveIntensity: 0.2
  });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), shirtMat);
  torso.position.set(0, 1.15, 0);
  grayson.add(torso);
  
  // Arms (skin tone)
  const armMat = new THREE.MeshStandardMaterial({ 
    color: 0xffe5cc,
    emissive: 0xffe5cc,
    emissiveIntensity: 0.15
  });
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6), armMat);
  leftArm.position.set(-0.3, 1.1, 0);
  grayson.add(leftArm);
  
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6), armMat);
  rightArm.position.set(0.3, 1.1, 0);
  grayson.add(rightArm);
  
  // Head (skin tone)
  const headMat = new THREE.MeshStandardMaterial({ 
    color: 0xffe5cc,
    emissive: 0xffe5cc,
    emissiveIntensity: 0.15
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), headMat);
  head.position.set(0, 1.75, 0);
  grayson.add(head);
  
  // Blonde hair (back and sides)
  const hairMat = new THREE.MeshStandardMaterial({ 
    color: 0xf4d03f,
    emissive: 0xf4d03f,
    emissiveIntensity: 0.2
  });
  
  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), hairMat);
  hairBack.position.set(0, 1.78, -0.15);
  hairBack.scale.set(0.8, 1, 0.6);
  grayson.add(hairBack);
  
  const hairLeft = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), hairMat);
  hairLeft.position.set(-0.18, 1.75, 0);
  hairLeft.scale.set(0.5, 1, 0.8);
  grayson.add(hairLeft);
  
  const hairRight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), hairMat);
  hairRight.position.set(0.18, 1.75, 0);
  hairRight.scale.set(0.5, 1, 0.8);
  grayson.add(hairRight);
  
  // Cap (blue)
  const capMat = new THREE.MeshStandardMaterial({ 
    color: 0x2196f3,
    emissive: 0x2196f3,
    emissiveIntensity: 0.25
  });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
  cap.position.set(0, 1.85, 0);
  grayson.add(cap);
  
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16), capMat);
  brim.position.set(0, 1.9, 0.08);
  grayson.add(brim);
  
  // Eyes (dark brown)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x3d2817 });
  
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
  leftEye.position.set(-0.07, 1.77, 0.21);
  grayson.add(leftEye);
  
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
  rightEye.position.set(0.07, 1.77, 0.21);
  grayson.add(rightEye);
  
  return {
    group: grayson,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    leftShoe,
    rightShoe
  };
}

