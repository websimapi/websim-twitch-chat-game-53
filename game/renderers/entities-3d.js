import * as THREE from 'three';
import { TILE_TYPE } from '../../map-tile-types.js';

export class Entities3D {
    constructor(renderer) {
        this.renderer = renderer;
        this.sprites = new Map(); // id -> THREE.Mesh

        // Billboard geometry for trees/props (vertical plane anchored at bottom)
        this.billboardGeometry = new THREE.PlaneGeometry(1, 1);
        this.billboardGeometry.translate(0, 0.5, 0);
    }

    render(game, frameId) {
        const map = game.map;
        const camX = Math.floor(game.camera.x);
        const camY = Math.floor(game.camera.y); // Camera Y is map Y (depth)
        const renderDist = game.settings.visuals.render_distance || 30;

        const minX = Math.max(0, camX - renderDist);
        const maxX = Math.min(map.width, camX + renderDist);
        const minY = Math.max(0, camY - renderDist);
        const maxY = Math.min(map.height, camY + renderDist);

        for (let y = minY; y < maxY; y++) {
            for (let x = minX; x < maxX; x++) {
                const tile = map.grid[y][x];
                if (tile === TILE_TYPE.GRASS) continue; // Skip empty tiles

                const z = map.getHeight(x + 0.5, y + 0.5);

                if (tile === TILE_TYPE.TREE) {
                    this.createOrUpdateSprite(`t_${x}_${y}`, 'tree', x + 0.5, y + 0.5, z, map.treeTile, 1.5, frameId);
                } else if (tile === TILE_TYPE.LOGS) {
                    this.createOrUpdateSprite(`l_${x}_${y}`, 'logs', x + 0.5, y + 0.5, z, map.logsTile, 1, frameId);
                } else if (tile === TILE_TYPE.BUSHES) {
                    this.createOrUpdateSprite(`b_${x}_${y}`, 'bushes', x + 0.5, y + 0.5, z, map.bushesTile, 1, frameId);
                } else if (tile === TILE_TYPE.FLOWER_PATCH) {
                     this.createOrUpdateSprite(`f_${x}_${y}`, 'flowers', x + 0.5, y + 0.5, z, map.flowerPatchTile, 0.8, frameId);
                }
            }
        }

        // Cleanup
        for (const [id, sprite] of this.sprites) {
            if (sprite.userData.lastFrameId !== frameId) {
                this.renderer.scene.remove(sprite);
                if (sprite.material) sprite.material.dispose();
                this.sprites.delete(id);
            }
        }
    }

    createOrUpdateSprite(id, type, x, y, z, image, scale = 1, frameId) {
        let mesh = this.sprites.get(id);
        const tex = this.renderer.getTexture(image);

        if (!mesh) {
            const mat = new THREE.MeshLambertMaterial({ 
                map: tex, 
                transparent: true, 
                alphaTest: 0.5,
                side: THREE.DoubleSide 
            });
            mesh = new THREE.Mesh(this.billboardGeometry, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.renderer.scene.add(mesh);
            this.sprites.set(id, mesh);
        }

        // Update Texture
        if (mesh.material.map !== tex) {
            mesh.material.map = tex;
            mesh.material.needsUpdate = true;
        }

        // Position
        let yOffset = 0;
        if (type === 'logs' || type === 'bushes' || type === 'flowers') {
            yOffset = -0.02;
        }
        mesh.position.set(x, z + yOffset, y); 
        mesh.scale.set(scale, scale, scale);

        // Fixed world-space orientation (no camera-facing rotation to avoid "arcing in")
        // Trees can have a slight angle if desired; others stay axis-aligned.
        if (type === 'tree') {
            mesh.rotation.set(0, Math.PI * 0.1, 0);
        } else {
            mesh.rotation.set(0, 0, 0);
        }

        mesh.userData.lastFrameId = frameId;
    }
}