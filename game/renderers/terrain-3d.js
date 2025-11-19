import * as THREE from 'three';

export class Terrain3D {
    constructor(renderer) {
        this.renderer = renderer;
        this.mesh = null;
    }

    update(map) {
        // Optimization: Only update terrain if strictly necessary (init or dimensions change)
        if (this.mesh && 
            this.mesh.geometry.parameters.width === map.width && 
            this.mesh.geometry.parameters.height === map.height) {
            
            // Check if texture needs update
            const tex = this.renderer.getTexture(map.grassTile);
            if (tex && this.mesh.material.map !== tex) {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(map.width, map.height);
                this.mesh.material.map = tex;
                this.mesh.material.needsUpdate = true;
            }
            return;
        }

        if (this.mesh) {
            this.renderer.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }

        // Geometry: Width, Height, SegmentsW, SegmentsH
        const geometry = new THREE.PlaneGeometry(map.width, map.height, map.width - 1, map.height - 1);
        
        // Material
        const grassTex = this.renderer.getTexture(map.grassTile);
        if (grassTex) {
            grassTex.wrapS = THREE.RepeatWrapping;
            grassTex.wrapT = THREE.RepeatWrapping;
            grassTex.repeat.set(map.width, map.height);
        }
        
        const material = new THREE.MeshLambertMaterial({ 
            map: grassTex,
            color: 0xddffdd
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2; // Lay flat
        
        // Offset to align top-left of map grid (0,0) with world space 0,0
        this.mesh.position.set(map.width / 2 - 0.5, 0, map.height / 2 - 0.5);
        this.mesh.receiveShadow = true;

        this.renderer.scene.add(this.mesh);

        // Initial height set
        const positions = this.mesh.geometry.attributes.position;
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const index = y * (map.width) + x;
                const h = map.getHeight(x, y);
                positions.setZ(index, h);
            }
        }
        positions.needsUpdate = true;
        this.mesh.geometry.computeVertexNormals();
    }
}