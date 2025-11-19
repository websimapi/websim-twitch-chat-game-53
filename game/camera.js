export class Camera {
    constructor(game, map, players, settings) {
        this.game = game; // Reference to game to access canvas/renderer info if needed
        this.map = map;
        this.players = players;
        this.settings = settings;

        // World coordinates (Grid units)
        this.x = map.width / 2;
        this.y = map.height / 2;

        this.focusedPlayerId = null;
        this.focusTimer = 0;
        this.FOCUS_DURATION = 60; // seconds

        // Zoom level (View Size)
        this.zoom = 20; // View height in grid units
        this.minZoom = 5;
        this.maxZoom = 60;

        // Rotation (Azimuth)
        this.rotation = Math.PI / 4; // 45 degrees default

        // NEW: orbital distance and elevation (height) for 3D camera
        this.distance = 20;
        this.elevation = 20;
        this.minElevation = 5;
        this.maxElevation = 40;

        // NEW: vertical offset of the look-at target so the player appears centered
        this.targetHeightOffset = 1.0;
    }

    setFocus(playerId) {
        this.focusedPlayerId = playerId;
        this.focusTimer = this.FOCUS_DURATION;
        const player = this.players.get(playerId);
        if (player) {
            console.log(`Camera focusing on: ${player.username} for ${this.FOCUS_DURATION} seconds.`);
        }
    }

    handleWheel(deltaY) {
        const zoomStep = 2;
        if (deltaY < 0) {
            this.zoom = Math.max(this.minZoom, this.zoom - zoomStep);
        } else {
            this.zoom = Math.min(this.maxZoom, this.zoom + zoomStep);
        }
        console.log(`Camera zoom (view height): ${this.zoom}`);
    }

    // Rotate camera around the target
    rotate(deltaX) {
        const sensitivity = 0.005;
        this.rotation -= deltaX * sensitivity;
    }

    // NEW: adjust camera elevation (up/down rotation) around the target
    adjustElevation(deltaY) {
        const sensitivity = 0.1;
        // Dragging up (negative deltaY) should raise the camera (increase elevation)
        this.elevation -= deltaY * sensitivity;
        this.elevation = Math.max(this.minElevation, Math.min(this.maxElevation, this.elevation));
    }

    // NEW: adjust pan offset in world units
    addPan(dxWorld, dyWorld) {
        this.panOffsetX += dxWorld;
        this.panOffsetY += dyWorld;
    }

    // Optional helper if we ever want to reset pan
    resetPan() {
        this.panOffsetX = 0;
        this.panOffsetY = 0;
    }

    update(deltaTime) {
        this.focusTimer -= deltaTime;
        if (this.focusTimer <= 0) {
            this.chooseNewFocus();
            this.focusTimer = this.FOCUS_DURATION;
        }

        const focusedPlayer = this.focusedPlayerId ? this.players.get(this.focusedPlayerId) : null;

        if (focusedPlayer) {
            const targetX = focusedPlayer.pixelX;
            const targetY = focusedPlayer.pixelY;

            // Smoothly interpolate camera position
            const lerpFactor = 1.0 - Math.exp(-5 * deltaTime); 
            
            this.x += (targetX - this.x) * lerpFactor;
            this.y += (targetY - this.y) * lerpFactor;
        }
        
        // Clamp to map bounds (roughly)
        this.x = Math.max(0, Math.min(this.map.width, this.x));
        this.y = Math.max(0, Math.min(this.map.height, this.y));
    }

    chooseNewFocus() {
        const activePlayers = Array.from(this.players.values()).filter(p => p.isPowered());

        if (activePlayers.length === 0) {
            this.focusedPlayerId = null;
            this.focusTimer = this.FOCUS_DURATION;
            return;
        }

        const randomIndex = Math.floor(Math.random() * activePlayers.length);
        const player = activePlayers[randomIndex];

        this.focusedPlayerId = player.id;
        console.log(`Camera focusing on: ${player.username} for ${this.FOCUS_DURATION} seconds.`);
    }

    switchToNextPlayerFocus() {
        const activePlayers = Array.from(this.players.values()).filter(p => p.isPowered());
        if (activePlayers.length === 0) return;

        activePlayers.sort((a, b) => a.username.localeCompare(b.username));

        if (activePlayers.length === 1) {
            this.setFocus(activePlayers[0].id);
            return;
        }

        let currentIndex = -1;
        if (this.focusedPlayerId) {
            currentIndex = activePlayers.findIndex(p => p.id === this.focusedPlayerId);
        }

        if (currentIndex === -1) {
            this.setFocus(activePlayers[0].id);
            return;
        }

        const nextIndex = (currentIndex + 1) % activePlayers.length;
        this.setFocus(activePlayers[nextIndex].id);
    }
}