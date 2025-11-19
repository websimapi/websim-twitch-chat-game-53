import { ThreeRenderer } from './game/renderer.js';
import { Map as GameMap } from './map.js';

export class LiveViewRenderer {
    constructor(canvas) {
        // The canvas passed here is the 2D canvas from the DOM.
        // We will hide it and append the Three.js renderer's canvas to the container.
        this.originalCanvas = canvas;
        this.container = canvas.parentElement;
        this.originalCanvas.style.display = 'none';

        // Initialize Three.js renderer attached to the container
        this.renderer = new ThreeRenderer(this.container);

        // Construct a mock Game object that mimics the structure required by ThreeRenderer
        this.mockGame = {
            // Create a map instance (we'll update its grid dynamically)
            map: new GameMap(1), // 1 unit tile size for 3D
            players: new Map(),
            camera: {
                x: 0, 
                y: 0,
                zoom: 20,
                rotation: Math.PI / 4,
                pitch: Math.PI / 3,
                focusedPlayerId: null,
                update: () => {} // Mock update
            },
            settings: {
                visuals: {
                    render_distance: 30, // Ensure entities render within the chunk
                    view_mode: '3d'
                }
            }
        };

        // Start loading assets for the map immediately
        this.mockGame.map.loadAssets();

        this.state = null;
        this.animationFrameId = null;

        // Handle resizing
        this.resizeObserver = new ResizeObserver(() => {
            if (this.renderer && this.renderer.resize) {
                this.renderer.resize(this.mockGame);
            }
        });
        this.resizeObserver.observe(this.container);

        // Enable zoom via mouse wheel
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomStep = 2;
            if (e.deltaY < 0) {
                this.mockGame.camera.zoom = Math.max(5, this.mockGame.camera.zoom - zoomStep);
            } else {
                this.mockGame.camera.zoom = Math.min(60, this.mockGame.camera.zoom + zoomStep);
            }
        }, { passive: false });
    }

    setViewMode(mode) {
        // Deprecated: Live View is now always 3D.
    }

    start() {
        this.renderLoop();
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    updateState(newState) {
        this.state = newState;
    }

    renderLoop() {
        this.render();
        this.animationFrameId = requestAnimationFrame(() => this.renderLoop());
    }

    render() {
        if (!this.state || !this.state.mapChunk) return;

        const { playerState, mapChunk, nearbyPlayers } = this.state;

        // 1. Update Mock Map from Chunk Data
        // We treat the chunk as the entire "world" for the renderer.
        // Coordinate system: Local chunk space (0,0 is top-left of chunk).
        const chunkWidth = mapChunk.grid[0].length;
        const chunkHeight = mapChunk.grid.length;

        if (this.mockGame.map.width !== chunkWidth || this.mockGame.map.height !== chunkHeight) {
            this.mockGame.map.width = chunkWidth;
            this.mockGame.map.height = chunkHeight;
        }

        this.mockGame.map.grid = mapChunk.grid;
        // Use heightGrid from payload, or fallback to flat if missing (legacy server check)
        if (mapChunk.heightGrid) {
            this.mockGame.map.heightGrid = mapChunk.heightGrid;
        } else {
            this.mockGame.map.heightGrid = Array(chunkHeight).fill(0).map(() => Array(chunkWidth).fill(0));
        }

        const originX = mapChunk.origin.x;
        const originY = mapChunk.origin.y;

        // 2. Update Players (Transform Absolute -> Local Coords)
        this.mockGame.players.clear();

        const transformPlayer = (pData) => ({
            ...pData,
            // Shift position to be relative to the map chunk
            pixelX: pData.pixelX - originX,
            pixelY: pData.pixelY - originY,
            x: pData.pixelX - originX,
            y: pData.pixelY - originY,
            z: pData.z || 0,
            // Mock methods needed by renderer
            isPowered: () => true,
            // Ensure colors and username are present
            color: pData.color || '#ffffff',
            username: pData.username || 'Unknown'
        });

        // Add Main Player
        const localMainPlayer = transformPlayer(playerState);
        this.mockGame.players.set(playerState.id, localMainPlayer);

        // Add Nearby Players
        if (nearbyPlayers) {
            nearbyPlayers.forEach(p => {
                this.mockGame.players.set(p.id, transformPlayer(p));
            });
        }

        // 3. Update Camera
        // Camera targets the main player in local space
        this.mockGame.camera.x = localMainPlayer.pixelX;
        this.mockGame.camera.y = localMainPlayer.pixelY;
        this.mockGame.camera.focusedPlayerId = playerState.id;

        // 4. Render
        this.renderer.render(this.mockGame);
    }
}