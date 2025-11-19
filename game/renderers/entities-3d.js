import * as THREE from 'three';
import { TILE_TYPE } from '../../map-tile-types.js';

export class Entities3D {
    constructor(renderer) {
        this.renderer = renderer;
        this.sprites = new Map(); // id -> THREE.Mesh

        // Billboard geometry for trees/standing props (vertical plane anchored at bottom)
        this.billboardGeometry = new THREE.PlaneGeometry(1, 1);
        this.billboardGeometry.translate(0, 0.5, 0);

        // New: flat ground quad (lies on XZ plane, anchored at center)
        this.groundGeometry = new THREE.PlaneGeometry(1, 1);
        this.groundGeometry.rotateX(-Math.PI / 2);
    }

    render(game, frameId) {
        const map = game.map;
        const camX = Math.floor(game.camera.x);
        const camY = Math.floor(game.camera.y);
        const renderDist = game.settings.visuals.render_distance || 30;

        const minX = Math.max(0, camX - renderDist);
        const maxX = Math.min(map.width, camX + renderDist);
        const minY = Math.max(0, camY - renderDist);
        const maxY = Math.min(map.height, camY + renderDist);

        for (let y = minY; y < maxY; y++) {
            for (let x = minX; x < maxX; x++) {
                const tile = map.grid[y][x];
                if (tile === TILE_TYPE.GRASS) continue;

                const h = map.getHeight(x + 0.5, y + 0.5);

                if (tile === TILE_TYPE.TREE) {
                    // Standing sprite (paper-style)
                    this.createOrUpdateSprite(`t_${x}_${y}`, 'tree', x + 0.5, y + 0.5, h, map.treeTile, 1.5, frameId);
                } else if (tile === TILE_TYPE.LOGS) {
                    // Ground sprite (flat on terrain)
                    this.createOrUpdateSprite(`l_${x}_${y}`, 'logs', x + 0.5, y + 0.5, h, map.logsTile, 0.9, frameId);
                } else if (tile === TILE_TYPE.BUSHES) {
                    // Ground sprite
                    this.createOrUpdateSprite(`b_${x}_${y}`, 'bushes', x + 0.5, y + 0.5, h, map.bushesTile, 0.9, frameId);
                } else if (tile === TILE_TYPE.FLOWER_PATCH) {
                    // Ground sprite
                    this.createOrUpdateSprite(`f_${x}_${y}`, 'flowers', x + 0.5, y + 0.5, h, map.flowerPatchTile, 0.8, frameId);
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

    createOrUpdateSprite(id, logicalType, x, y, height, image, scale = 1, frameId) {
        // logicalType: 'tree' -> standing, others -> ground
        const renderKind = (logicalType === 'tree') ? 'standing' : 'ground';

        let mesh = this.sprites.get(id);
        const tex = this.renderer.getTexture(image);

        if (!mesh) {
            const geometry = (renderKind === 'ground') ? this.groundGeometry : this.billboardGeometry;
            const mat = new THREE.MeshLambertMaterial({ 
                map: tex, 
                transparent: true, 
                alphaTest: 0.5,
                side: THREE.DoubleSide 
            });
            mesh = new THREE.Mesh(geometry, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.renderer.scene.add(mesh);
            this.sprites.set(id, mesh);
        }

        // Update Texture if changed
        if (mesh.material.map !== tex) {
            mesh.material.map = tex;
            mesh.material.needsUpdate = true;
        }

        // Position:
        // X/Z are map coordinates, Y is height from terrain
        let yOffset = 0;
        if (renderKind === 'ground') {
            // Float slightly above terrain to avoid z-fighting
            yOffset = 0.03;
        } else if (logicalType === 'logs' || logicalType === 'bushes' || logicalType === 'flowers') {
            yOffset = -0.02;
        }

        mesh.position.set(x, height + yOffset, y);
        mesh.scale.set(scale, scale, scale);

        // Orientation:
        if (renderKind === 'standing') {
            // Slight fixed angle for trees, no camera-facing rotation to avoid "arcing in"
            if (logicalType === 'tree') {
                mesh.rotation.set(0, Math.PI * 0.1, 0);
            } else {
                mesh.rotation.set(0, 0, 0);
            }
        } else {
            // Ground quads lie flat; base geometry is already rotated -PI/2
            mesh.rotation.set(0, 0, 0);
        }

        mesh.userData.lastFrameId = frameId;
    }
}