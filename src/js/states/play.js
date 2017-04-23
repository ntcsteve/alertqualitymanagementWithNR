class PlayState extends Phaser.State {
    create() {
        console.log('[play] starting play state');

        // for easy access to this state for debugging in browser console
        window.play = this;

        this.createBackground();
        this.createSounds();

        this.createActors();

        this.playMusic();

        setInterval(() => this.createAsteroid(), 1000);
        setInterval(() => this.createComet(), 5000);
        setInterval(() => this.createBarrage(), 20000)

    }

    update() {
        this.updateCelestials();
        this.updateCollisions();
        this.updateBarrierRotation();
    }

    render() {
        // this.game.debug.body(this.actors.earth);
        // this.game.debug.body(this.actors.barrier);
        // this.actors.asteroids.forEach(this.game.debug.body.bind(this.game.debug));
        // this.actors.comets.forEach(this.game.debug.body.bind(this.game.debug));
    }

    shutdown() {
    }

    /* create functions */

    createActors() {
        this.actors = {
            earth: this.createEarth(),
            barrier: this.createBarrier(),
            asteroids: this.game.add.group(),
            comets: this.game.add.group(),
        };

    }

    createSounds() {
        this.sounds = {
            AsteroidHit2 : this.game.add.audio('AsteroidHit2'),
            AsteroidHit1 : this.game.add.audio('AsteroidHit1'),
            ButtonTap    : this.game.add.audio('ButtonTap'),
            Random       : this.game.add.audio('Random'),
            Siren        : this.game.add.audio('Siren'),
            PlayMusic    : this.game.add.audio('PlayMusic'),
        };
    }

    createBackground() {
        return this.game.add.sprite(0, 0, 'background');
    }

    createEarth() {
        console.log('[play] creating earth');
        const earth = this.game.add.sprite(this.game.world.centerX, this.game.world.centerY, 'earth');

        this.game.physics.arcade.enableBody(earth);
        earth.body.setCircle(earth.width / 2);
        earth.body.immovable = true;

        earth.anchor.set(0.5, 0.5);
        // DEBUG
        earth.inputEnabled = true;
        earth.events.onInputDown.add(() => this.sounds.Siren.play(), this);

        return earth;
    }

    createAsteroid() {
        return this.createCelestial('asteroid');
    }

    createComet() {
        return this.createCelestial('comet');
    }

    createCelestial(type) {
        let frameRange;
        let group;
        switch (type.toLowerCase()) {
            case 'asteroid':
                frameRange = 4;
                group = this.actors.asteroids;
                break;
            case 'comet':
                frameRange = 2;
                group = this.actors.comets;
                break;
            default:
                frameRange = 4;
                group = this.actors.asteroids;
        }

        let point = this.getRandomOffscreenPoint();
        const celestial = this.game.add.sprite(point.x, point.y, type + '-sheet', Math.floor(Math.random()*frameRange));
        celestial.anchor.set(0.5, 0.5);
        celestial.bringToTop();

        this.game.physics.arcade.enableBody(celestial);
        celestial.body.setCircle(celestial.width / 2);
        celestial.body.velocity.set(Math.random() * 40, Math.random() * 40);
        celestial.body.angularVelocity = 2*(12 * Math.random() - 6);

        group.add(celestial);

        return celestial;
    }

    createBarrage(count=60, radius=1200) {
        let x, y;
        let angle = 360 / count;

        // spawn asteroids in a circle
        for (let i = 0; i < 360; i += angle) {
            x = this.game.world.centerX + radius * Math.cos(i);
            y = this.game.world.centerY + radius * Math.sin(i);

            let ast = this.createAsteroid();
            ast.position.x = x;
            ast.position.y = y;

            // set initial velocity
            let direction = Phaser.Point.subtract(this.actors.earth.position, ast.position);

            direction.normalize();
            direction.multiply(config.BARRAGE_SPEED, config.BARRAGE_SPEED);

            let vx = this.game.rnd.between(-config.BARRAGE_VARIANCE, config.BARRAGE_VARIANCE);
            let vy = this.game.rnd.between(-config.BARRAGE_VARIANCE, config.BARRAGE_VARIANCE);

            ast.body.velocity.set(direction.x + vx, direction.y + vy);
        }
    }

    createBarrier() {
        const barrier = this.game.add.sprite(this.game.world.centerX, this.game.world.centerY, 'barrier');
        // barrier.scale.set(10, 10);
        barrier.anchor.set(0.5, 0.5);

        this.game.physics.arcade.enableBody(barrier);
        barrier.body.setCircle(barrier.width / 2);
        barrier.body.immovable = true;

        return barrier;
    }

    /* update functions */

    updateCollisions() {
        this.game.physics.arcade.collide(this.actors.barrier, this.actors.comets, this.deflectCelestial, this.barrierOverlap, this);
        this.game.physics.arcade.collide(this.actors.barrier, this.actors.asteroids, this.deflectCelestial, this.barrierOverlap, this);
        this.game.physics.arcade.collide(this.actors.earth, this.actors.asteroids, this.asteroidStrike, null, this);
        this.game.physics.arcade.collide(this.actors.earth, this.actors.comets, this.cometStrike, null, this);
    }

    updateBarrierRotation() {
        const x = this.game.input.mousePointer.x - this.actors.barrier.position.x;
        const y = this.game.input.mousePointer.y - this.actors.barrier.position.y;
        let angle = -1 * Math.atan(x/y) + 2*Math.PI;
        if (y > 0) {
            angle += Math.PI;
        }
        this.actors.barrier.rotation = angle;
    }

    updateCelestials() {
        this.actors.asteroids.forEach(cel => this.updateCelestial(cel));
        this.actors.comets.forEach(cel => this.updateCelestial(cel));
    }

    updateCelestial(cel) {
        this.game.physics.arcade.accelerateToObject(cel, this.actors.earth);
    }

    /* misc functions */

    asteroidStrike(earth, asteroid) {
        console.log('[play] asteroid strike');
        this.sounds.AsteroidHit1.play();
        asteroid.destroy();
        this.game.camera.shake(config.ASTEROID_CAM_SHAKE_AMOUNT, config.ASTEROID_CAM_SHAKE_DURATION_MS);
    }

    cometStrike(earth, comet) {
        console.log('[play] comet strike');
        this.sounds.AsteroidHit2.play();
        comet.destroy();
        this.game.camera.shake(config.COMET_CAM_SHAKE_AMOUNT, config.COMET_CAM_SHAKE_DURATION_MS);
    }

    deflectCelestial(barrier, cel) {
        console.log('[play] celestial deflect');
        const bounceDir = Phaser.Point.subtract(cel.position, this.actors.earth.position);
        bounceDir.multiply(0.5, 0.5);
        cel.body.velocity.copyFrom(bounceDir);
        this.game.time.events.add(config.DEFLECT_BLINK_DURATION, () => cel.destroy(), this);
    }

    barrierOverlap(barrier, celestial) {
        // find the angle between the barrier's center and the point where the
        // asteroid is touching

        const celPoint = celestial.position.clone().subtract(this.game.world.centerX, this.game.world.centerY).normalize();
        const barPoint = this.game.input.mousePointer.position.clone().subtract(this.game.world.centerX, this.game.world.centerY).normalize();

        const distance = barPoint.distance(celPoint);

        return distance < config.BARRIER_WIDTH;
    }

    playMusic() {
        this.sounds.PlayMusic.fadeIn(300);
    }

    getRandomOffscreenPoint() {
        let self = this;
        let padding = 200;

        let functions = [
            () => {
                // LEFT
                let x = -padding;
                let y = self.game.rnd.between(0, self.game.world.height);
                return {x, y};
            },
            () => {
                // RIGHT
                let x = self.game.world.width + padding;
                let y = self.game.rnd.between(0, self.game.world.height);
                return {x, y};
            },
            () => {
                // TOP
                let x = self.game.rnd.between(0, self.game.world.width);
                let y = -padding;
                return {x, y};
            },
            () => {
                // BOTTOM
                let x = self.game.rnd.between(0, self.game.world.width);
                let y = self.game.world.height + padding;
                return {x, y};
            },
        ];

        let f = functions[self.game.rnd.between(0, functions.length-1)];

        return f();
    }
}
