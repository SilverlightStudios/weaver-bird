/**
 * Generated Particle Data
 *
 * Auto-generated from Minecraft 1.21.11-0.18.3 by Rust extraction.
 * Do not edit manually - changes will be overwritten.
 *
 * Generated at: 2026-01-18T21:34:15+00:00
 */
import type { ParticleData } from "../types";

export const particleData: ParticleData = {
  version: "1.21.11-0.18.3",
  extractedAt: "2026-01-18T21:34:15+00:00",
  physics: {
  "__particle_class_net.minecraft.client.particle.GlowParticle": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "explosion": {
    "lifetime": [
      6,
      10
    ],
    "gravity": null,
    "size": 2.0,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "falling_dripstone_lava": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "trail": {
    "lifetime": null,
    "gravity": null,
    "size": 0.26,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.CritParticle": {
    "lifetime": null,
    "gravity": 0.5,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.7,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "__particle_class_net.minecraft.client.particle.CampfireSmokeParticle": {
    "lifetime": [
      280,
      330
    ],
    "gravity": 0.000003,
    "size": 0.1,
    "scale": 3.0,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "tick_velocity_jitter": [
      0.0002,
      0.0,
      0.0002
    ],
    "skips_friction": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "squid_ink": {
    "lifetime": null,
    "gravity": null,
    "size": 0.5,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.92,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "campfire_cosy_smoke": {
    "lifetime": [
      280,
      330
    ],
    "gravity": 0.000003,
    "size": 0.1,
    "scale": 3.0,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "tick_velocity_jitter": [
      0.0002,
      0.0,
      0.0002
    ],
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.FlameParticle": {
    "lifetime": [
      12,
      24
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.01,
      0.01,
      0.01
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": [
      0.05,
      0.05,
      0.05
    ],
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "quadratic_shrink",
      "factor": 0.5
    }
  },
  "electric_spark": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": 0.0,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "vault_connection": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": 1.5,
    "has_physics": false,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "nautilus": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "witch": {
    "lifetime": [
      8,
      20
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.2,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "falling_dust": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "spit": {
    "lifetime": [
      18,
      42
    ],
    "gravity": 0.5,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.9,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "falling_water": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "trial_spawner_detected_player_ominous": {
    "lifetime": null,
    "gravity": -0.1,
    "size": 0.1,
    "scale": 1.5,
    "has_physics": true,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.0,
      0.9,
      0.0
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "__particle_class_net.minecraft.client.particle.ReversePortalParticle": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "ease_in_quad"
    }
  },
  "mycelium": {
    "lifetime": [
      20,
      50
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.02,
      0.02,
      0.02
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "lava": {
    "lifetime": [
      16,
      40
    ],
    "gravity": 0.75,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.999,
    "velocity_multiplier": [
      0.8,
      0.0,
      0.8
    ],
    "velocity_add": [
      0.0,
      0.25,
      0.0
    ],
    "velocity_jitter": [
      0.0,
      0.4,
      0.0
    ],
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "spawns_particles": [
      {
        "particle_id": "smoke",
        "probability_expr": "this.random.nextFloat() > (float)this.age / (float)this.lifetime"
      }
    ],
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "quadratic_shrink",
      "factor": 1.0
    }
  },
  "crimson_spore": {
    "lifetime": [
      16,
      40
    ],
    "gravity": 0.0,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 1.0,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.FireflyParticle": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.8,
      0.8,
      0.8
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "landing_lava": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "__particle_class_net.minecraft.client.particle.LavaParticle": {
    "lifetime": [
      16,
      40
    ],
    "gravity": 0.75,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.999,
    "velocity_multiplier": [
      0.8,
      0.0,
      0.8
    ],
    "velocity_add": [
      0.0,
      0.25,
      0.0
    ],
    "velocity_jitter": [
      0.0,
      0.4,
      0.0
    ],
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "spawns_particles": [
      {
        "particle_id": "smoke",
        "probability_expr": "this.random.nextFloat() > (float)this.age / (float)this.lifetime"
      }
    ],
    "skips_friction": false,
    "quad_size_curve": {
      "type": "quadratic_shrink",
      "factor": 1.0
    }
  },
  "effect": {
    "lifetime": [
      8,
      20
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.2,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.SculkChargePopParticle": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": 1.0,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "wax_on": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": 0.0,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "current_down": {
    "lifetime": null,
    "gravity": 0.002,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.07,
      1.0,
      0.07
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "falling_lava": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "angry_villager": {
    "lifetime": [
      16,
      16
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.86,
    "velocity_multiplier": [
      0.01,
      0.01,
      0.01
    ],
    "velocity_add": [
      0.0,
      0.1,
      0.0
    ],
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "dripping_honey": {
    "lifetime": [
      100,
      100
    ],
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "__particle_class_net.minecraft.client.particle.NoteParticle": {
    "lifetime": [
      6,
      6
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.66,
    "velocity_multiplier": [
      0.01,
      0.01,
      0.01
    ],
    "velocity_add": [
      0.0,
      0.2,
      0.0
    ],
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "__particle_class_net.minecraft.client.particle.SonicBoomParticle": {
    "lifetime": [
      16,
      16
    ],
    "gravity": null,
    "size": 1.5,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "happy_villager": {
    "lifetime": [
      20,
      50
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.02,
      0.02,
      0.02
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.SculkChargeParticle": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": 1.5,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "flame": {
    "lifetime": [
      12,
      24
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.01,
      0.01,
      0.01
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": [
      0.05,
      0.05,
      0.05
    ],
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "quadratic_shrink",
      "factor": 0.5
    }
  },
  "__particle_class_net.minecraft.client.particle.SquidInkParticle": {
    "lifetime": null,
    "gravity": null,
    "size": 0.5,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.92,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "enchant": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "totem_of_undying": {
    "lifetime": [
      60,
      72
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.6,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "poof": {
    "lifetime": [
      18,
      42
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.9,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.SmokeParticle": {
    "lifetime": [
      8,
      40
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": true,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": [
      -1.0,
      -1.0,
      -1.0
    ],
    "color_scale": 0.3,
    "lifetime_base": 8,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "glow": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "underwater": {
    "lifetime": [
      16,
      40
    ],
    "gravity": 0.0,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 1.0,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "trial_spawner_detected_player": {
    "lifetime": null,
    "gravity": -0.1,
    "size": 0.1,
    "scale": 1.5,
    "has_physics": true,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.0,
      0.9,
      0.0
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "dust": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "fishing": {
    "lifetime": [
      8,
      20
    ],
    "gravity": 0.0,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.3,
      0.0,
      0.3
    ],
    "velocity_add": [
      0.0,
      0.2,
      0.0
    ],
    "velocity_jitter": [
      0.0,
      0.2,
      0.0
    ],
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "egg_crack": {
    "lifetime": [
      20,
      50
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.02,
      0.02,
      0.02
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.PlayerCloudParticle": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "bubble": {
    "lifetime": [
      8,
      20
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.85,
      0.85,
      0.85
    ],
    "velocity_add": [
      0.0,
      0.002,
      0.0
    ],
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "heart": {
    "lifetime": [
      16,
      16
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.86,
    "velocity_multiplier": [
      0.01,
      0.01,
      0.01
    ],
    "velocity_add": [
      0.0,
      0.1,
      0.0
    ],
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "__particle_class_net.minecraft.client.particle.HeartParticle": {
    "lifetime": [
      16,
      16
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.86,
    "velocity_multiplier": [
      0.01,
      0.01,
      0.01
    ],
    "velocity_add": [
      0.0,
      0.1,
      0.0
    ],
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "__particle_class_net.minecraft.client.particle.SoulParticle": {
    "lifetime": [
      12,
      24
    ],
    "gravity": null,
    "size": 0.1,
    "scale": 1.5,
    "has_physics": null,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.01,
      0.01,
      0.01
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": [
      0.05,
      0.05,
      0.05
    ],
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.LargeSmokeParticle": {
    "lifetime": [
      8,
      40
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": true,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": [
      -1.0,
      -1.0,
      -1.0
    ],
    "color_scale": 0.3,
    "lifetime_base": 8,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "sculk_soul": {
    "lifetime": [
      12,
      24
    ],
    "gravity": null,
    "size": 0.1,
    "scale": 1.5,
    "has_physics": null,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.01,
      0.01,
      0.01
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": [
      0.05,
      0.05,
      0.05
    ],
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.TrailParticle": {
    "lifetime": null,
    "gravity": null,
    "size": 0.26,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "pale_oak_leaves": {
    "lifetime": [
      300,
      300
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 1.0,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "splash": {
    "lifetime": [
      8,
      20
    ],
    "gravity": 0.04,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.3,
      0.0,
      0.3
    ],
    "velocity_add": [
      0.0,
      0.2,
      0.0
    ],
    "velocity_jitter": [
      0.0,
      0.2,
      0.0
    ],
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.WhiteSmokeParticle": {
    "lifetime": [
      8,
      40
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": true,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": [
      0.7294118,
      0.69411767,
      0.7607843
    ],
    "color_scale": 0.3,
    "lifetime_base": 8,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "instant_effect": {
    "lifetime": [
      8,
      20
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.2,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "damage_indicator": {
    "lifetime": null,
    "gravity": 0.5,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.7,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "small_flame": {
    "lifetime": [
      12,
      24
    ],
    "gravity": null,
    "size": 0.1,
    "scale": 0.5,
    "has_physics": null,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.01,
      0.01,
      0.01
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": [
      0.05,
      0.05,
      0.05
    ],
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "quadratic_shrink",
      "factor": 0.5
    }
  },
  "__particle_class_net.minecraft.client.particle.SuspendedTownParticle": {
    "lifetime": [
      20,
      50
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.02,
      0.02,
      0.02
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "landing_honey": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "bubble_column_up": {
    "lifetime": [
      40,
      100
    ],
    "gravity": -0.125,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.85,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "soul": {
    "lifetime": [
      12,
      24
    ],
    "gravity": null,
    "size": 0.1,
    "scale": 1.5,
    "has_physics": null,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.01,
      0.01,
      0.01
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": [
      0.05,
      0.05,
      0.05
    ],
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.DragonBreathParticle": {
    "lifetime": [
      20,
      50
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": [
      0.0,
      0.002,
      0.0
    ],
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "__particle_class_net.minecraft.client.particle.DustParticle": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "spore_blossom_air": {
    "lifetime": [
      16,
      40
    ],
    "gravity": 0.0,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 1.0,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "rain": {
    "lifetime": [
      8,
      20
    ],
    "gravity": 0.06,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.3,
      0.0,
      0.3
    ],
    "velocity_add": [
      0.0,
      0.2,
      0.0
    ],
    "velocity_jitter": [
      0.0,
      0.2,
      0.0
    ],
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "sonic_boom": {
    "lifetime": [
      16,
      16
    ],
    "gravity": null,
    "size": 1.5,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "small_gust": {
    "lifetime": [
      12,
      16
    ],
    "gravity": null,
    "size": 1.0,
    "scale": 0.15,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "dragon_breath": {
    "lifetime": [
      20,
      50
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": [
      0.0,
      0.002,
      0.0
    ],
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "__particle_class_net.minecraft.client.particle.BubblePopParticle": {
    "lifetime": [
      4,
      4
    ],
    "gravity": 0.008,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "copper_fire_flame": {
    "lifetime": [
      12,
      24
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.01,
      0.01,
      0.01
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": [
      0.05,
      0.05,
      0.05
    ],
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "quadratic_shrink",
      "factor": 0.5
    }
  },
  "vibration": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "__particle_class_net.minecraft.client.particle.WhiteAshParticle": {
    "lifetime": [
      20,
      100
    ],
    "gravity": 0.0125,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      -0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": [
      -1.0,
      -1.0,
      -1.0
    ],
    "color_scale": 0.0,
    "lifetime_base": 20,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "__particle_class_net.minecraft.client.particle.PortalParticle": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "ease_in_quad"
    }
  },
  "warped_spore": {
    "lifetime": [
      16,
      40
    ],
    "gravity": 0.0,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 1.0,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "dust_plume": {
    "lifetime": [
      7,
      35
    ],
    "gravity": 0.88,
    "size": 0.1,
    "scale": 1.0,
    "has_physics": false,
    "alpha": null,
    "friction": 0.92,
    "velocity_multiplier": [
      0.7,
      0.6,
      0.7
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": [
      -1.0,
      -1.0,
      -1.0
    ],
    "color_scale": 0.5,
    "lifetime_base": 7,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "__particle_class_net.minecraft.client.particle.FlyStraightTowardsParticle": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.SuspendedParticle": {
    "lifetime": [
      16,
      40
    ],
    "gravity": 0.0,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 1.0,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "entity_effect": {
    "lifetime": [
      8,
      20
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.2,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "ash": {
    "lifetime": [
      20,
      100
    ],
    "gravity": 0.1,
    "size": 0.1,
    "scale": 1.0,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      -0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": [
      -1.0,
      -1.0,
      -1.0
    ],
    "color_scale": 0.5,
    "lifetime_base": 20,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "dripping_lava": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "trial_omen": {
    "lifetime": [
      8,
      20
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.2,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "glow_squid_ink": {
    "lifetime": null,
    "gravity": null,
    "size": 0.5,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.92,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.FallingLeavesParticle": {
    "lifetime": [
      300,
      300
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 1.0,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.WaterCurrentDownParticle": {
    "lifetime": null,
    "gravity": 0.002,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.07,
      1.0,
      0.07
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.SnowflakeParticle": {
    "lifetime": [
      18,
      42
    ],
    "gravity": 0.225,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 1.0,
    "velocity_multiplier": [
      0.95,
      0.9,
      0.95
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "dolphin": {
    "lifetime": [
      20,
      50
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.02,
      0.02,
      0.02
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.AttackSweepParticle": {
    "lifetime": [
      4,
      4
    ],
    "gravity": null,
    "size": 1.0,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "falling_dripstone_water": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "cloud": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "dripping_dripstone_lava": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "__particle_class_net.minecraft.client.particle.WakeParticle": {
    "lifetime": [
      8,
      20
    ],
    "gravity": 0.0,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.3,
      0.0,
      0.3
    ],
    "velocity_add": [
      0.0,
      0.2,
      0.0
    ],
    "velocity_jitter": [
      0.0,
      0.2,
      0.0
    ],
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.BubbleParticle": {
    "lifetime": [
      8,
      20
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.85,
      0.85,
      0.85
    ],
    "velocity_add": [
      0.0,
      0.002,
      0.0
    ],
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "bubble_pop": {
    "lifetime": [
      4,
      4
    ],
    "gravity": 0.008,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.SplashParticle": {
    "lifetime": [
      8,
      20
    ],
    "gravity": 0.04,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.3,
      0.0,
      0.3
    ],
    "velocity_add": [
      0.0,
      0.2,
      0.0
    ],
    "velocity_jitter": [
      0.0,
      0.2,
      0.0
    ],
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "cherry_leaves": {
    "lifetime": [
      300,
      300
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 1.0,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "end_rod": {
    "lifetime": [
      60,
      72
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.91,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "firefly": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": 1.5,
    "has_physics": null,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.8,
      0.8,
      0.8
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.TrialSpawnerDetectionParticle": {
    "lifetime": null,
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": true,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.0,
      0.9,
      0.0
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "__particle_class_net.minecraft.client.particle.FallingDustParticle": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "__particle_class_net.minecraft.client.particle.BubbleColumnUpParticle": {
    "lifetime": [
      40,
      100
    ],
    "gravity": -0.125,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.85,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "dripping_obsidian_tear": {
    "lifetime": [
      100,
      100
    ],
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "flash": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "crit": {
    "lifetime": null,
    "gravity": 0.5,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.7,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "falling_nectar": {
    "lifetime": null,
    "gravity": 0.007,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "__particle_class_net.minecraft.client.particle.SpitParticle": {
    "lifetime": [
      18,
      42
    ],
    "gravity": 0.5,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.9,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "dust_color_transition": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": false
  },
  "shriek": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "__particle_class_net.minecraft.client.particle.TotemParticle": {
    "lifetime": [
      60,
      72
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.6,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.ExplodeParticle": {
    "lifetime": [
      18,
      42
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.9,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "enchanted_hit": {
    "lifetime": null,
    "gravity": 0.5,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.7,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "dripping_water": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "__particle_class_net.minecraft.client.particle.HugeExplosionParticle": {
    "lifetime": [
      6,
      10
    ],
    "gravity": null,
    "size": 2.0,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "sweep_attack": {
    "lifetime": [
      4,
      4
    ],
    "gravity": null,
    "size": 1.0,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "large_smoke": {
    "lifetime": [
      8,
      40
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": true,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": [
      -1.0,
      -1.0,
      -1.0
    ],
    "color_scale": 0.3,
    "lifetime_base": 8,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "snowflake": {
    "lifetime": [
      18,
      42
    ],
    "gravity": 0.225,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 1.0,
    "velocity_multiplier": [
      0.95,
      0.9,
      0.95
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "gust": {
    "lifetime": [
      12,
      16
    ],
    "gravity": null,
    "size": 1.0,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "composter": {
    "lifetime": [
      20,
      50
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.02,
      0.02,
      0.02
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "soul_fire_flame": {
    "lifetime": [
      12,
      24
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.01,
      0.01,
      0.01
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": [
      0.05,
      0.05,
      0.05
    ],
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "quadratic_shrink",
      "factor": 0.5
    }
  },
  "falling_honey": {
    "lifetime": null,
    "gravity": 0.01,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "scrape": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": 0.0,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "dripping_dripstone_water": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "__particle_class_net.minecraft.client.particle.SpellParticle": {
    "lifetime": [
      8,
      20
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.2,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.GustParticle": {
    "lifetime": [
      12,
      16
    ],
    "gravity": null,
    "size": 1.0,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "reverse_portal": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "ease_in_quad"
    }
  },
  "sculk_charge_pop": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": 1.0,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.AshParticle": {
    "lifetime": [
      20,
      100
    ],
    "gravity": 0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      -0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": [
      -1.0,
      -1.0,
      -1.0
    ],
    "color_scale": 0.5,
    "lifetime_base": 20,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "falling_obsidian_tear": {
    "lifetime": null,
    "gravity": 0.01,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "firework": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": false
  },
  "smoke": {
    "lifetime": [
      8,
      40
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": 1.0,
    "has_physics": true,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": [
      -1.0,
      -1.0,
      -1.0
    ],
    "color_scale": 0.3,
    "lifetime_base": 8,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "tinted_leaves": {
    "lifetime": [
      300,
      300
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 1.0,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "portal": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "ease_in_quad"
    }
  },
  "landing_obsidian_tear": {
    "lifetime": null,
    "gravity": null,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "falling_spore_blossom": {
    "lifetime": null,
    "gravity": 0.005,
    "size": null,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": null,
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "uses_static_texture": true
  },
  "sculk_charge": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": 1.5,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "raid_omen": {
    "lifetime": [
      8,
      20
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.2,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "white_ash": {
    "lifetime": [
      20,
      100
    ],
    "gravity": 0.0125,
    "size": 0.1,
    "scale": 1.0,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      -0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": [
      -1.0,
      -1.0,
      -1.0
    ],
    "color_scale": 0.0,
    "lifetime_base": 20,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "infested": {
    "lifetime": [
      8,
      20
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.2,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "white_smoke": {
    "lifetime": [
      8,
      40
    ],
    "gravity": -0.1,
    "size": 0.1,
    "scale": 1.0,
    "has_physics": true,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": [
      0.7294118,
      0.69411767,
      0.7607843
    ],
    "color_scale": 0.3,
    "lifetime_base": 8,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "ominous_spawning": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "campfire_signal_smoke": {
    "lifetime": [
      280,
      330
    ],
    "gravity": 0.000003,
    "size": 0.1,
    "scale": 3.0,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "tick_velocity_jitter": [
      0.0002,
      0.0,
      0.0002
    ],
    "skips_friction": true,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "note": {
    "lifetime": [
      6,
      6
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.66,
    "velocity_multiplier": [
      0.01,
      0.01,
      0.01
    ],
    "velocity_add": [
      0.0,
      0.2,
      0.0
    ],
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": null,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": true,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "__particle_class_net.minecraft.client.particle.EndRodParticle": {
    "lifetime": [
      60,
      72
    ],
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": 0.91,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "sneeze": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      0.1,
      0.1,
      0.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "wax_off": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": 0.0,
    "has_physics": false,
    "alpha": null,
    "friction": 0.96,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": true,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "uses_static_texture": false,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.WaterDropParticle": {
    "lifetime": [
      8,
      20
    ],
    "gravity": 0.06,
    "size": 0.1,
    "scale": null,
    "has_physics": null,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      0.3,
      0.0,
      0.3
    ],
    "velocity_add": [
      0.0,
      0.2,
      0.0
    ],
    "velocity_jitter": [
      0.0,
      0.2,
      0.0
    ],
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "constant"
    }
  },
  "__particle_class_net.minecraft.client.particle.DustPlumeParticle": {
    "lifetime": [
      7,
      35
    ],
    "gravity": 0.88,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": 0.92,
    "velocity_multiplier": [
      0.7,
      0.6,
      0.7
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": [
      -1.0,
      -1.0,
      -1.0
    ],
    "color_scale": 0.5,
    "lifetime_base": 7,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": false,
    "quad_size_curve": {
      "type": "linear_grow_clamped",
      "multiplier": 32.0
    }
  },
  "__particle_class_net.minecraft.client.particle.FlyTowardsPositionParticle": {
    "lifetime": null,
    "gravity": null,
    "size": 0.1,
    "scale": null,
    "has_physics": false,
    "alpha": null,
    "friction": null,
    "velocity_multiplier": [
      1.1,
      1.0,
      1.1
    ],
    "velocity_add": null,
    "velocity_jitter": null,
    "position_jitter": null,
    "color": null,
    "color_scale": null,
    "lifetime_base": null,
    "lifetime_animation": false,
    "tick_velocity_delta": null,
    "skips_friction": true,
    "quad_size_curve": {
      "type": "constant"
    }
  }
},
  blocks: {
  "wither_rose": {
    "className": "net.minecraft.world.level.block.WitherRoseBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + $5.x) + Math.random() / 5.0",
          "$2.getY() + (0.5 - Math.random())",
          "($2.getZ() + $5.z) + Math.random() / 5.0"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "3",
        "emissionSource": "animateTick"
      }
    ]
  },
  "magenta_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "copper_wall_torch": {
    "className": "net.minecraft.world.level.block.WallTorchBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.5) + 0.27 * (($0.getValue(FACING)).getOpposite()).getStepX()",
          "($2.getY() + 0.7) + 0.22",
          "($2.getZ() + 0.5) + 0.27 * (($0.getValue(FACING)).getOpposite()).getStepZ()"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "copper_fire_flame",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.5) + 0.27 * (($0.getValue(FACING)).getOpposite()).getStepX()",
          "($2.getY() + 0.7) + 0.22",
          "($2.getZ() + 0.5) + 0.27 * (($0.getValue(FACING)).getOpposite()).getStepZ()"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "soul_campfire": {
    "className": "net.minecraft.world.level.block.CampfireBlock",
    "emissions": [
      {
        "particleId": "lava",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "(Math.random() / 2.0)",
          "5.0E-5",
          "Math.random() / 2.0"
        ],
        "probabilityExpr": "$3.nextInt(5) == 0",
        "countExpr": "$3.nextInt(1) + 1",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "campfire_signal_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$1.getX() + 0.5 + Math.random() / 3.0 * ($4.nextBoolean() ? 1 : -1)",
          "$1.getY() + Math.random() + Math.random()",
          "$1.getZ() + 0.5 + Math.random() / 3.0 * ($4.nextBoolean() ? 1 : -1)"
        ],
        "velocityExpr": [
          "0.0",
          "0.07",
          "0.0"
        ],
        "alwaysVisible": true,
        "emissionSource": "makeParticles"
      },
      {
        "particleId": "campfire_cosy_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$1.getX() + 0.5 + Math.random() / 3.0 * ($4.nextBoolean() ? 1 : -1)",
          "$1.getY() + Math.random() + Math.random()",
          "$1.getZ() + 0.5 + Math.random() / 3.0 * ($4.nextBoolean() ? 1 : -1)"
        ],
        "velocityExpr": [
          "0.0",
          "0.07",
          "0.0"
        ],
        "alwaysVisible": true,
        "emissionSource": "makeParticles"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$1.getX() + 0.5 + Math.random() / 4.0 * ($4.nextBoolean() ? 1 : -1)",
          "$1.getY() + 0.4",
          "$1.getZ() + 0.5 + Math.random() / 4.0 * ($4.nextBoolean() ? 1 : -1)"
        ],
        "velocityExpr": [
          "0.0",
          "0.005",
          "0.0"
        ],
        "emissionSource": "makeParticles"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($1.getX() + 0.5 - ((Direction.from2DDataValue(Math.floorMod($7 + ($2.getValue(CampfireBlock.FACING).get2DDataValue()), 4))).getStepX() * 0.3125) + ((Direction.from2DDataValue(Math.floorMod($7 + ($2.getValue(CampfireBlock.FACING).get2DDataValue()), 4))).getClockWise().getStepX() * 0.3125))",
          "($1.getY() + 0.5)",
          "($1.getZ() + 0.5 - ((Direction.from2DDataValue(Math.floorMod($7 + ($2.getValue(CampfireBlock.FACING).get2DDataValue()), 4))).getStepZ() * 0.3125) + ((Direction.from2DDataValue(Math.floorMod($7 + ($2.getValue(CampfireBlock.FACING).get2DDataValue()), 4))).getClockWise().getStepZ() * 0.3125))"
        ],
        "velocityExpr": [
          "0.0",
          "5.0E-4",
          "0.0"
        ],
        "probabilityExpr": "Math.random() < 0.2",
        "countExpr": "4",
        "loopCountExpr": "$3.items.size()",
        "loopIndexVar": "$7",
        "emissionSource": "particleTick"
      }
    ]
  },
  "deepslate_redstone_ore": {
    "className": "net.minecraft.world.level.block.RedStoneOreBlock",
    "emissions": [
      {
        "particleId": "dust",
        "options": {
          "kind": "dust",
          "color": [
            1.0,
            0.0,
            0.0
          ],
          "scale": 1.0
        },
        "condition": null,
        "positionExpr": [
          "$1.getX() + ($6 == Direction.Axis.X ? 0.5 + 0.5625 * $4.getStepX() : Math.random())",
          "$1.getY() + ($6 == Direction.Axis.Y ? 0.5 + 0.5625 * $4.getStepY() : Math.random())",
          "$1.getZ() + ($6 == Direction.Axis.Z ? 0.5 + 0.5625 * $4.getStepZ() : Math.random())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "spawnParticles"
      }
    ]
  },
  "white_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "white_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "redstone_torch": {
    "className": "net.minecraft.world.level.block.RedstoneTorchBlock",
    "emissions": [
      {
        "particleId": "dust",
        "options": {
          "kind": "dust",
          "color": [
            1.0,
            0.0,
            0.0
          ],
          "scale": 1.0
        },
        "condition": "LIT",
        "positionExpr": [
          "($2.getX() + 0.5 + (Math.random() - 0.5) * 0.2)",
          "($2.getY() + 0.7 + (Math.random() - 0.5) * 0.2)",
          "($2.getZ() + 0.5 + (Math.random() - 0.5) * 0.2)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "spore_blossom": {
    "className": "net.minecraft.world.level.block.SporeBlossomBlock",
    "emissions": [
      {
        "particleId": "falling_spore_blossom",
        "options": null,
        "condition": null,
        "positionExpr": [
          "(($2.getX()) + Math.random())",
          "(($2.getY()) + 0.7)",
          "(($2.getZ()) + Math.random())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "spore_blossom_air",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$10.getX() + Math.random()",
          "$10.getY() + Math.random()",
          "$10.getZ() + Math.random()"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "14",
        "emissionSource": "animateTick"
      }
    ]
  },
  "red_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "repeater": {
    "className": "net.minecraft.world.level.block.RepeaterBlock",
    "emissions": [
      {
        "particleId": "dust",
        "options": {
          "kind": "dust",
          "color": [
            1.0,
            0.0,
            0.0
          ],
          "scale": 1.0
        },
        "condition": "POWERED",
        "positionExpr": [
          "($2.getX() + 0.5 + (Math.random() - 0.5) * 0.2) + (((-5.0) /= 16.0) * ((Direction)$0.getValue(FACING)).getStepX())",
          "($2.getY() + 0.4 + (Math.random() - 0.5) * 0.2)",
          "($2.getZ() + 0.5 + (Math.random() - 0.5) * 0.2) + ((-5.0) * ((Direction)$0.getValue(FACING)).getStepZ())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "soul_fire": {
    "className": "net.minecraft.world.level.block.BaseFireBlock",
    "emissions": [
      {
        "particleId": "large_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + Math.random())",
          "($2.getY() + Math.random() * 0.5 + 0.5)",
          "($2.getZ() + Math.random())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "large_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + Math.random() * 0.1)",
          "($2.getY() + Math.random())",
          "($2.getZ() + Math.random())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "large_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "(($2.getX() + 1) - Math.random() * 0.1)",
          "($2.getY() + Math.random())",
          "($2.getZ() + Math.random())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "large_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + Math.random())",
          "($2.getY() + Math.random())",
          "($2.getZ() + Math.random() * 0.1)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "large_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + Math.random())",
          "($2.getY() + Math.random())",
          "(($2.getZ() + 1) - Math.random() * 0.1)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "large_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + Math.random())",
          "(($2.getY() + 1) - Math.random() * 0.1)",
          "($2.getZ() + Math.random())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "animateTick"
      }
    ]
  },
  "soul_torch": {
    "className": "net.minecraft.world.level.block.TorchBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.5)",
          "($2.getY() + 0.7)",
          "($2.getZ() + 0.5)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "soul_fire_flame",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.5)",
          "($2.getY() + 0.7)",
          "($2.getZ() + 0.5)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "light_gray_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "pink_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "orange_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "redstone_ore": {
    "className": "net.minecraft.world.level.block.RedStoneOreBlock",
    "emissions": [
      {
        "particleId": "dust",
        "options": {
          "kind": "dust",
          "color": [
            1.0,
            0.0,
            0.0
          ],
          "scale": 1.0
        },
        "condition": null,
        "positionExpr": [
          "$1.getX() + ($6 == Direction.Axis.X ? 0.5 + 0.5625 * $4.getStepX() : Math.random())",
          "$1.getY() + ($6 == Direction.Axis.Y ? 0.5 + 0.5625 * $4.getStepY() : Math.random())",
          "$1.getZ() + ($6 == Direction.Axis.Z ? 0.5 + 0.5625 * $4.getStepZ() : Math.random())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "spawnParticles"
      }
    ]
  },
  "gray_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "brewing_stand": {
    "className": "net.minecraft.world.level.block.BrewingStandBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.4 + Math.random() * 0.2)",
          "($2.getY() + 0.7 + Math.random() * 0.3)",
          "($2.getZ() + 0.4 + Math.random() * 0.2)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "nether_portal": {
    "className": "net.minecraft.world.level.block.NetherPortalBlock",
    "emissions": [
      {
        "particleId": "portal",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + Math.random())",
          "($2.getY() + Math.random())",
          "($2.getZ() + Math.random())"
        ],
        "velocityExpr": [
          "((Math.random() - 0.5) * 0.5)",
          "((Math.random() - 0.5) * 0.5)",
          "((Math.random() - 0.5) * 0.5)"
        ],
        "countExpr": "4",
        "emissionSource": "animateTick"
      }
    ]
  },
  "furnace": {
    "className": "net.minecraft.world.level.block.FurnaceBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "($2.getX() + 0.5) + ($8 == Direction.Axis.X ? ((Direction)$0.getValue(FACING)).getStepX() * 0.52 : (Math.random() * 0.6 - 0.3))",
          "($2.getY()) + (Math.random() * 6.0 / 16.0)",
          "($2.getZ() + 0.5) + ($8 == Direction.Axis.Z ? ((Direction)$0.getValue(FACING)).getStepZ() * 0.52 : (Math.random() * 0.6 - 0.3))"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "($2.getX() + 0.5) + ($8 == Direction.Axis.X ? ((Direction)$0.getValue(FACING)).getStepX() * 0.52 : (Math.random() * 0.6 - 0.3))",
          "($2.getY()) + (Math.random() * 6.0 / 16.0)",
          "($2.getZ() + 0.5) + ($8 == Direction.Axis.Z ? ((Direction)$0.getValue(FACING)).getStepZ() * 0.52 : (Math.random() * 0.6 - 0.3))"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "gray_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "lime_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "brown_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "orange_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "blast_furnace": {
    "className": "net.minecraft.world.level.block.BlastFurnaceBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "($2.getX() + 0.5) + ($8 == Direction.Axis.X ? ((Direction)$0.getValue(FACING)).getStepX() * 0.52 : (Math.random() * 0.6 - 0.3))",
          "($2.getY()) + (Math.random() * 9.0 / 16.0)",
          "($2.getZ() + 0.5) + ($8 == Direction.Axis.Z ? ((Direction)$0.getValue(FACING)).getStepZ() * 0.52 : (Math.random() * 0.6 - 0.3))"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "purple_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "mycelium": {
    "className": "net.minecraft.world.level.block.MyceliumBlock",
    "emissions": [
      {
        "particleId": "mycelium",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$2.getX() + Math.random()",
          "$2.getY() + 1.1",
          "$2.getZ() + Math.random()"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "$3.nextInt(10) == 0",
        "emissionSource": "animateTick"
      }
    ]
  },
  "crying_obsidian": {
    "className": "net.minecraft.world.level.block.CryingObsidianBlock",
    "emissions": [
      {
        "particleId": "dripping_obsidian_tear",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$2.getX() + ((Direction.getRandom($3)).getStepX() == 0 ? Math.random() : 0.5 + (Direction.getRandom($3)).getStepX() * 0.6)",
          "$2.getY() + ((Direction.getRandom($3)).getStepY() == 0 ? Math.random() : 0.5 + (Direction.getRandom($3)).getStepY() * 0.6)",
          "$2.getZ() + ((Direction.getRandom($3)).getStepZ() == 0 ? Math.random() : 0.5 + (Direction.getRandom($3)).getStepZ() * 0.6)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "copper_torch": {
    "className": "net.minecraft.world.level.block.TorchBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.5)",
          "($2.getY() + 0.7)",
          "($2.getZ() + 0.5)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "copper_fire_flame",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.5)",
          "($2.getY() + 0.7)",
          "($2.getZ() + 0.5)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "magenta_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "black_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "pink_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "cyan_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "end_rod": {
    "className": "net.minecraft.world.level.block.EndRodBlock",
    "emissions": [
      {
        "particleId": "end_rod",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.55 - (Math.random() * 0.1)) + ((Direction)$0.getValue(FACING)).getStepX() * (0.4 - (Math.random() + Math.random()) * 0.4)",
          "($2.getY() + 0.55 - (Math.random() * 0.1)) + ((Direction)$0.getValue(FACING)).getStepY() * (0.4 - (Math.random() + Math.random()) * 0.4)",
          "($2.getZ() + 0.55 - (Math.random() * 0.1)) + ((Direction)$0.getValue(FACING)).getStepZ() * (0.4 - (Math.random() + Math.random()) * 0.4)"
        ],
        "velocityExpr": [
          "(Math.random() * 2 - 1) * 0.005",
          "(Math.random() * 2 - 1) * 0.005",
          "(Math.random() * 2 - 1) * 0.005"
        ],
        "probabilityExpr": "$3.nextInt(5) == 0",
        "emissionSource": "animateTick"
      }
    ]
  },
  "green_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "end_gateway": {
    "className": "net.minecraft.world.level.block.EndGatewayBlock",
    "emissions": [
      {
        "particleId": "portal",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + Math.random())",
          "($2.getY() + Math.random())",
          "($2.getZ() + Math.random())"
        ],
        "velocityExpr": [
          "((Math.random() - 0.5) * 0.5)",
          "((Math.random() - 0.5) * 0.5)",
          "((Math.random() - 0.5) * 0.5)"
        ],
        "countExpr": "(((TheEndGatewayBlockEntity)$4).getParticleAmount())",
        "emissionSource": "animateTick"
      }
    ]
  },
  "candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "lime_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "smoker": {
    "className": "net.minecraft.world.level.block.SmokerBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "($2.getX() + 0.5)",
          "($2.getY()) + 1.1",
          "($2.getZ() + 0.5)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "blue_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "dried_ghast": {
    "className": "net.minecraft.world.level.block.DriedGhastBlock",
    "emissions": [
      {
        "particleId": "white_smoke",
        "options": null,
        "condition": "WATERLOGGED",
        "positionExpr": [
          "($2.getX() + 0.5)",
          "($2.getY() + 0.5)",
          "($2.getZ() + 0.5)"
        ],
        "velocityExpr": [
          "0.0",
          "0.02",
          "0.0"
        ],
        "probabilityExpr": "$3.nextInt(6) == 0",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "happy_villager",
        "options": null,
        "condition": "WATERLOGGED",
        "positionExpr": [
          "($2.getX() + 0.5) + ((Math.random() * 2.0 - 1.0) / 3.0)",
          "($2.getY() + 0.5) + 0.4",
          "($2.getZ() + 0.5) + ((Math.random() * 2.0 - 1.0) / 3.0)"
        ],
        "velocityExpr": [
          "0.0",
          "Math.random()",
          "0.0"
        ],
        "probabilityExpr": "$3.nextInt(6) == 0",
        "emissionSource": "animateTick"
      }
    ]
  },
  "respawn_anchor": {
    "className": "net.minecraft.world.level.block.RespawnAnchorBlock",
    "emissions": [
      {
        "particleId": "reverse_portal",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.5 + (0.5 - Math.random()))",
          "($2.getY() + 1.0)",
          "($2.getZ() + 0.5 + (0.5 - Math.random()))"
        ],
        "velocityExpr": [
          "0.0",
          "(Math.random() * 0.04)",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "red_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "yellow_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "beehive": {
    "className": "net.minecraft.world.level.block.BeehiveBlock",
    "emissions": [
      {
        "particleId": "dripping_honey",
        "options": null,
        "condition": null,
        "positionExpr": [
          "Mth.lerp($0.Math.random(), $1, $2)",
          "$5",
          "Mth.lerp($0.Math.random(), $3, $4)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "spawnFluidParticle"
      }
    ]
  },
  "redstone_wire": {
    "className": "net.minecraft.world.level.block.RedStoneWireBlock",
    "emissions": [
      {
        "particleId": "dust",
        "options": {
          "kind": "dust",
          "color": null,
          "scale": 1.0
        },
        "condition": null,
        "positionExpr": [
          "$2.getX() + (0.5 + (0.4375 * $4.getStepX()) + (($6 + ($7 - $6) * Math.random()) * $5.getStepX()))",
          "$2.getY() + (0.5 + (0.4375 * $4.getStepY()) + (($6 + ($7 - $6) * Math.random()) * $5.getStepY()))",
          "$2.getZ() + (0.5 + (0.4375 * $4.getStepZ()) + (($6 + ($7 - $6) * Math.random()) * $5.getStepZ()))"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "spawnParticlesAlongLine"
      }
    ]
  },
  "light_blue_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "wall_torch": {
    "className": "net.minecraft.world.level.block.WallTorchBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.5) + 0.27 * (($0.getValue(FACING)).getOpposite()).getStepX()",
          "($2.getY() + 0.7) + 0.22",
          "($2.getZ() + 0.5) + 0.27 * (($0.getValue(FACING)).getOpposite()).getStepZ()"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "flame",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.5) + 0.27 * (($0.getValue(FACING)).getOpposite()).getStepX()",
          "($2.getY() + 0.7) + 0.22",
          "($2.getZ() + 0.5) + 0.27 * (($0.getValue(FACING)).getOpposite()).getStepZ()"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "cyan_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "bee_nest": {
    "className": "net.minecraft.world.level.block.BeehiveBlock",
    "emissions": [
      {
        "particleId": "dripping_honey",
        "options": null,
        "condition": null,
        "positionExpr": [
          "Mth.lerp($0.Math.random(), $1, $2)",
          "$5",
          "Mth.lerp($0.Math.random(), $3, $4)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "spawnFluidParticle"
      }
    ]
  },
  "yellow_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "light_blue_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "redstone_wall_torch": {
    "className": "net.minecraft.world.level.block.RedstoneWallTorchBlock",
    "emissions": [
      {
        "particleId": "dust",
        "options": {
          "kind": "dust",
          "color": [
            1.0,
            0.0,
            0.0
          ],
          "scale": 1.0
        },
        "condition": "LIT",
        "positionExpr": [
          "($2.getX() + 0.5 + (Math.random() - 0.5) * 0.2 + 0.27 * ($0.getValue(FACING).getOpposite()).getStepX())",
          "($2.getY() + 0.7 + (Math.random() - 0.5) * 0.2 + 0.22)",
          "($2.getZ() + 0.5 + (Math.random() - 0.5) * 0.2 + 0.27 * ($0.getValue(FACING).getOpposite()).getStepZ())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "firefly_bush": {
    "className": "net.minecraft.world.level.block.FireflyBushBlock",
    "emissions": [
      {
        "particleId": "firefly",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + Math.random() * 10.0 - 5.0)",
          "($2.getY() + Math.random() * 5.0)",
          "($2.getZ() + Math.random() * 10.0 - 5.0)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "Math.random() <= 0.7",
        "emissionSource": "animateTick"
      }
    ]
  },
  "campfire": {
    "className": "net.minecraft.world.level.block.CampfireBlock",
    "emissions": [
      {
        "particleId": "lava",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "(Math.random() / 2.0)",
          "5.0E-5",
          "Math.random() / 2.0"
        ],
        "probabilityExpr": "$3.nextInt(5) == 0",
        "countExpr": "$3.nextInt(1) + 1",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "campfire_signal_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$1.getX() + 0.5 + Math.random() / 3.0 * ($4.nextBoolean() ? 1 : -1)",
          "$1.getY() + Math.random() + Math.random()",
          "$1.getZ() + 0.5 + Math.random() / 3.0 * ($4.nextBoolean() ? 1 : -1)"
        ],
        "velocityExpr": [
          "0.0",
          "0.07",
          "0.0"
        ],
        "alwaysVisible": true,
        "emissionSource": "makeParticles"
      },
      {
        "particleId": "campfire_cosy_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$1.getX() + 0.5 + Math.random() / 3.0 * ($4.nextBoolean() ? 1 : -1)",
          "$1.getY() + Math.random() + Math.random()",
          "$1.getZ() + 0.5 + Math.random() / 3.0 * ($4.nextBoolean() ? 1 : -1)"
        ],
        "velocityExpr": [
          "0.0",
          "0.07",
          "0.0"
        ],
        "alwaysVisible": true,
        "emissionSource": "makeParticles"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$1.getX() + 0.5 + Math.random() / 4.0 * ($4.nextBoolean() ? 1 : -1)",
          "$1.getY() + 0.4",
          "$1.getZ() + 0.5 + Math.random() / 4.0 * ($4.nextBoolean() ? 1 : -1)"
        ],
        "velocityExpr": [
          "0.0",
          "0.005",
          "0.0"
        ],
        "emissionSource": "makeParticles"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($1.getX() + 0.5 - ((Direction.from2DDataValue(Math.floorMod($7 + ($2.getValue(CampfireBlock.FACING).get2DDataValue()), 4))).getStepX() * 0.3125) + ((Direction.from2DDataValue(Math.floorMod($7 + ($2.getValue(CampfireBlock.FACING).get2DDataValue()), 4))).getClockWise().getStepX() * 0.3125))",
          "($1.getY() + 0.5)",
          "($1.getZ() + 0.5 - ((Direction.from2DDataValue(Math.floorMod($7 + ($2.getValue(CampfireBlock.FACING).get2DDataValue()), 4))).getStepZ() * 0.3125) + ((Direction.from2DDataValue(Math.floorMod($7 + ($2.getValue(CampfireBlock.FACING).get2DDataValue()), 4))).getClockWise().getStepZ() * 0.3125))"
        ],
        "velocityExpr": [
          "0.0",
          "5.0E-4",
          "0.0"
        ],
        "probabilityExpr": "Math.random() < 0.2",
        "countExpr": "4",
        "loopCountExpr": "$3.items.size()",
        "loopIndexVar": "$7",
        "emissionSource": "particleTick"
      }
    ]
  },
  "fire": {
    "className": "net.minecraft.world.level.block.BaseFireBlock",
    "emissions": [
      {
        "particleId": "large_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + Math.random())",
          "($2.getY() + Math.random() * 0.5 + 0.5)",
          "($2.getZ() + Math.random())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "large_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + Math.random() * 0.1)",
          "($2.getY() + Math.random())",
          "($2.getZ() + Math.random())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "large_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "(($2.getX() + 1) - Math.random() * 0.1)",
          "($2.getY() + Math.random())",
          "($2.getZ() + Math.random())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "large_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + Math.random())",
          "($2.getY() + Math.random())",
          "($2.getZ() + Math.random() * 0.1)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "large_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + Math.random())",
          "($2.getY() + Math.random())",
          "(($2.getZ() + 1) - Math.random() * 0.1)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "large_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + Math.random())",
          "(($2.getY() + 1) - Math.random() * 0.1)",
          "($2.getZ() + Math.random())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "animateTick"
      }
    ]
  },
  "torch": {
    "className": "net.minecraft.world.level.block.TorchBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.5)",
          "($2.getY() + 0.7)",
          "($2.getZ() + 0.5)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "flame",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.5)",
          "($2.getY() + 0.7)",
          "($2.getZ() + 0.5)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "enchanting_table": {
    "className": "net.minecraft.world.level.block.EnchantingTableBlock",
    "emissions": [
      {
        "particleId": "enchant",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 2.0",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "($4.getX() + Math.random()) - 0.5",
          "($4.getY() - Math.random() - 1.0)",
          "($4.getZ() + Math.random()) - 0.5"
        ],
        "probabilityExpr": "$3.nextInt(16) == 0",
        "emissionSource": "animateTick"
      }
    ]
  },
  "soul_wall_torch": {
    "className": "net.minecraft.world.level.block.WallTorchBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.5) + 0.27 * (($0.getValue(FACING)).getOpposite()).getStepX()",
          "($2.getY() + 0.7) + 0.22",
          "($2.getZ() + 0.5) + 0.27 * (($0.getValue(FACING)).getOpposite()).getStepZ()"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "soul_fire_flame",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.5) + 0.27 * (($0.getValue(FACING)).getOpposite()).getStepX()",
          "($2.getY() + 0.7) + 0.22",
          "($2.getZ() + 0.5) + 0.27 * (($0.getValue(FACING)).getOpposite()).getStepZ()"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "wet_sponge": {
    "className": "net.minecraft.world.level.block.WetSpongeBlock",
    "emissions": [
      {
        "particleId": "dripping_water",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX())",
          "($2.getY())",
          "($2.getZ())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "green_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "purple_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "brown_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "black_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "end_portal": {
    "className": "net.minecraft.world.level.block.EndPortalBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + Math.random())",
          "($2.getY() + 0.8)",
          "($2.getZ() + Math.random())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      }
    ]
  },
  "light_gray_candle_cake": {
    "className": "net.minecraft.world.level.block.CandleCakeBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 1",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 1",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "blue_candle": {
    "className": "net.minecraft.world.level.block.CandleBlock",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=1",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=2",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=3",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.4375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.4375",
          "$2.getY() + 0.3125",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.625",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.375",
          "$2.getY() + 0.4375",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "nextFloat() < 0.3",
        "emissionSource": "animateTick"
      },
      {
        "particleId": "small_flame",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$2.getX() + 0.5625",
          "$2.getY() + 0.5",
          "$2.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "animateTick"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.4375",
          "$3.getY() + 0.3125",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.625",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.5625"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.375",
          "$3.getY() + 0.4375",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      },
      {
        "particleId": "smoke",
        "options": null,
        "condition": "LIT && CANDLES=4",
        "positionExpr": [
          "$3.getX() + 0.5625",
          "$3.getY() + 0.5",
          "$3.getZ() + 0.375"
        ],
        "velocityExpr": [
          "0.0",
          "0.1",
          "0.0"
        ],
        "emissionSource": "extinguish"
      }
    ]
  },
  "ender_chest": {
    "className": "net.minecraft.world.level.block.EnderChestBlock",
    "emissions": [
      {
        "particleId": "portal",
        "options": null,
        "condition": null,
        "positionExpr": [
          "($2.getX() + 0.5 + 0.25 * ($3.nextInt(2) * 2 - 1))",
          "($2.getY() + Math.random())",
          "($2.getZ() + 0.5 + 0.25 * ($3.nextInt(2) * 2 - 1))"
        ],
        "velocityExpr": [
          "(Math.random() * ($3.nextInt(2) * 2 - 1))",
          "((Math.random() - 0.5) * 0.125)",
          "(Math.random() * ($3.nextInt(2) * 2 - 1))"
        ],
        "countExpr": "3",
        "emissionSource": "animateTick"
      }
    ]
  }
},
  entities: {
  "abstract_hurting_projectile": {
    "className": "net.minecraft.world.entity.projectile.hurtingprojectile.AbstractHurtingProjectile",
    "emissions": [
      {
        "particleId": "bubble",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$1.x - $0.x * 0.25",
          "$1.y - $0.y * 0.25",
          "$1.z - $0.z * 0.25"
        ],
        "velocityExpr": [
          "$0.x",
          "$0.y",
          "$0.z"
        ],
        "countExpr": "4",
        "emissionSource": "applyInertia"
      }
    ]
  },
  "abstract_boat": {
    "className": "net.minecraft.world.entity.vehicle.boat.AbstractBoat",
    "emissions": [
      {
        "particleId": "splash",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() + Math.random()",
          "this.getY() + 0.7",
          "this.getZ() + Math.random()"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "this.random.nextInt(100) == 0",
        "emissionSource": "onAboveBubbleColumn"
      }
    ]
  },
  "wither_boss": {
    "className": "net.minecraft.world.entity.boss.wither.WitherBoss",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "(this.getHeadX($19)) + (Math.random() * 2 - 1) * (0.3 * this.getScale())",
          "(this.getHeadY($19)) + (Math.random() * 2 - 1) * (0.3 * this.getScale())",
          "(this.getHeadZ($19)) + (Math.random() * 2 - 1) * (0.3 * this.getScale())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "loopCountExpr": "3",
        "loopIndexVar": "$19",
        "emissionSource": "aiStep"
      }
    ]
  },
  "ominous_item_spawner": {
    "className": "net.minecraft.world.entity.OminousItemSpawner",
    "emissions": [
      {
        "particleId": "ominous_spawning",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$0.x()",
          "$0.y()",
          "$0.z()"
        ],
        "velocityExpr": [
          "$5.x()",
          "$5.y()",
          "$5.z()"
        ],
        "countExpr": "(this.random.nextIntBetweenInclusive(1, 3))",
        "emissionSource": "addParticles"
      }
    ]
  },
  "phantom": {
    "className": "net.minecraft.world.entity.monster.Phantom",
    "emissions": [
      {
        "particleId": "mycelium",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() + (Mth.cos((this.getYRot() * (Math.PI / 180))) * (this.getBbWidth() * 1.48))",
          "this.getY() + ((0.3 + (Mth.cos(((this.getUniqueFlapTickOffset() + this.tickCount) * 7.448451 * (Math.PI / 180) + Math.PI))) * 0.45) * this.getBbHeight() * 2.5)",
          "this.getZ() + (Mth.sin((this.getYRot() * (Math.PI / 180))) * (this.getBbWidth() * 1.48))"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "tick"
      },
      {
        "particleId": "mycelium",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() - (Mth.cos((this.getYRot() * (Math.PI / 180))) * (this.getBbWidth() * 1.48))",
          "this.getY() + ((0.3 + (Mth.cos(((this.getUniqueFlapTickOffset() + this.tickCount) * 7.448451 * (Math.PI / 180) + Math.PI))) * 0.45) * this.getBbHeight() * 2.5)",
          "this.getZ() - (Mth.sin((this.getYRot() * (Math.PI / 180))) * (this.getBbWidth() * 1.48))"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "tick"
      }
    ]
  },
  "witch": {
    "className": "net.minecraft.world.entity.monster.Witch",
    "emissions": [
      {
        "particleId": "witch",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() + (Math.random() * 2 - 1) * 0.13",
          "this.getBoundingBox().maxY + 0.5 + (Math.random() * 2 - 1) * 0.13",
          "this.getZ() + (Math.random() * 2 - 1) * 0.13"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "this.random.nextInt(35) + 10",
        "emissionSource": "handleEntityEvent"
      }
    ]
  },
  "eye_of_ender": {
    "className": "net.minecraft.world.entity.projectile.EyeOfEnder",
    "emissions": [
      {
        "particleId": "bubble",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$0.x",
          "$0.y",
          "$0.z"
        ],
        "velocityExpr": [
          "$1.x",
          "$1.y",
          "$1.z"
        ],
        "countExpr": "4",
        "emissionSource": "spawnParticles"
      },
      {
        "particleId": "portal",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$0.x + Math.random() * 0.6 - 0.3",
          "$0.y - 0.5",
          "$0.z + Math.random() * 0.6 - 0.3"
        ],
        "velocityExpr": [
          "$1.x",
          "$1.y",
          "$1.z"
        ],
        "emissionSource": "spawnParticles"
      }
    ]
  },
  "thrown_enderpearl": {
    "className": "net.minecraft.world.entity.projectile.throwableitemprojectile.ThrownEnderpearl",
    "emissions": [
      {
        "particleId": "portal",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX()",
          "this.getY() + Math.random() * 2.0",
          "this.getZ()"
        ],
        "velocityExpr": [
          "(Math.random() * 2 - 1)",
          "0.0",
          "(Math.random() * 2 - 1)"
        ],
        "countExpr": "32",
        "emissionSource": "onHit"
      }
    ]
  },
  "ender_man": {
    "className": "net.minecraft.world.entity.monster.EnderMan",
    "emissions": [
      {
        "particleId": "portal",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(0.5)",
          "this.getRandomY() - 0.25",
          "this.getRandomZ(0.5)"
        ],
        "velocityExpr": [
          "(Math.random() - 0.5) * 2.0",
          "-Math.random()",
          "(Math.random() - 0.5) * 2.0"
        ],
        "countExpr": "2",
        "emissionSource": "aiStep"
      }
    ]
  },
  "entity": {
    "className": "net.minecraft.world.entity.Entity",
    "emissions": [
      {
        "particleId": "bubble",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() + ((Math.random() * 2.0 - 1.0) * this.dimensions.width())",
          "((Mth.floor(this.getY())) + 1.0)",
          "this.getZ() + ((Math.random() * 2.0 - 1.0) * this.dimensions.width())"
        ],
        "velocityExpr": [
          "$2.x",
          "$2.y - Math.random() * 0.2",
          "$2.z"
        ],
        "emissionSource": "doWaterSplashEffect"
      },
      {
        "particleId": "splash",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() + ((Math.random() * 2.0 - 1.0) * this.dimensions.width())",
          "((Mth.floor(this.getY())) + 1.0)",
          "this.getZ() + ((Math.random() * 2.0 - 1.0) * this.dimensions.width())"
        ],
        "velocityExpr": [
          "$2.x",
          "$2.y",
          "$2.z"
        ],
        "emissionSource": "doWaterSplashEffect"
      }
    ]
  },
  "dragon_death_phase": {
    "className": "net.minecraft.world.entity.boss.enderdragon.phases.DragonDeathPhase",
    "emissions": [
      {
        "particleId": "explosion_emitter",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.dragon.getX() + ((this.dragon.getRandom().nextFloat() - 0.5) * 8.0)",
          "this.dragon.getY() + 2.0 + ((this.dragon.getRandom().nextFloat() - 0.5) * 4.0)",
          "this.dragon.getZ() + ((this.dragon.getRandom().nextFloat() - 0.5) * 8.0)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "doClientTick"
      }
    ]
  },
  "ender_dragon": {
    "className": "net.minecraft.world.entity.boss.enderdragon.EnderDragon",
    "emissions": [
      {
        "particleId": "explosion",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() + ((Math.random() - 0.5) * 8.0)",
          "this.getY() + 2.0 + ((Math.random() - 0.5) * 4.0)",
          "this.getZ() + ((Math.random() - 0.5) * 8.0)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "aiStep"
      },
      {
        "particleId": "explosion_emitter",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() + ((Math.random() - 0.5) * 8.0)",
          "this.getY() + 2.0 + ((Math.random() - 0.5) * 4.0)",
          "this.getZ() + ((Math.random() - 0.5) * 8.0)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "tickDeath"
      }
    ]
  },
  "llama_spit": {
    "className": "net.minecraft.world.entity.projectile.LlamaSpit",
    "emissions": [
      {
        "particleId": "spit",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX()",
          "this.getY()",
          "this.getZ()"
        ],
        "velocityExpr": [
          "$1.x * (0.4 + 0.1 * $2)",
          "$1.y",
          "$1.z * (0.4 + 0.1 * $2)"
        ],
        "loopCountExpr": "7",
        "loopIndexVar": "$2",
        "emissionSource": "recreateFromPacket"
      }
    ]
  },
  "blaze": {
    "className": "net.minecraft.world.entity.monster.Blaze",
    "emissions": [
      {
        "particleId": "large_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(0.5)",
          "this.getRandomY()",
          "this.getRandomZ(0.5)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "aiStep"
      }
    ]
  },
  "glow_squid": {
    "className": "net.minecraft.world.entity.animal.squid.GlowSquid",
    "emissions": [
      {
        "particleId": "glow",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(0.6)",
          "this.getRandomY()",
          "this.getRandomZ(0.6)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "aiStep"
      }
    ]
  },
  "endermite": {
    "className": "net.minecraft.world.entity.monster.Endermite",
    "emissions": [
      {
        "particleId": "portal",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(0.5)",
          "this.getRandomY()",
          "this.getRandomZ(0.5)"
        ],
        "velocityExpr": [
          "(Math.random() - 0.5) * 2.0",
          "-Math.random()",
          "(Math.random() - 0.5) * 2.0"
        ],
        "countExpr": "2",
        "emissionSource": "aiStep"
      }
    ]
  },
  "wolf": {
    "className": "net.minecraft.world.entity.animal.wolf.Wolf",
    "emissions": [
      {
        "particleId": "splash",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() + ((Math.random() * 2.0 - 1.0) * this.getBbWidth() * 0.5)",
          "((this.getY()) + 0.8)",
          "this.getZ() + ((Math.random() * 2.0 - 1.0) * this.getBbWidth() * 0.5)"
        ],
        "velocityExpr": [
          "$2.x",
          "$2.y",
          "$2.z"
        ],
        "countExpr": "((Mth.sin(((this.shakeAnim - 0.4) * Math.PI)) * 7.0))",
        "emissionSource": "tick"
      }
    ]
  },
  "firework_rocket_entity": {
    "className": "net.minecraft.world.entity.projectile.FireworkRocketEntity",
    "emissions": [
      {
        "particleId": "firework",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX()",
          "this.getY()",
          "this.getZ()"
        ],
        "velocityExpr": [
          "(Math.random() * 2 - 1) * 0.05",
          "-this.getDeltaMovement().y * 0.5",
          "(Math.random() * 2 - 1) * 0.05"
        ],
        "emissionSource": "tick"
      }
    ]
  },
  "tadpole": {
    "className": "net.minecraft.world.entity.animal.frog.Tadpole",
    "emissions": [
      {
        "particleId": "happy_villager",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(1.0)",
          "this.getRandomY() + 0.5",
          "this.getRandomZ(1.0)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "feed"
      }
    ]
  },
  "llama": {
    "className": "net.minecraft.world.entity.animal.equine.Llama",
    "emissions": [
      {
        "particleId": "happy_villager",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(1.0)",
          "this.getRandomY() + 0.5",
          "this.getRandomZ(1.0)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "handleEating"
      }
    ]
  },
  "ageable_mob": {
    "className": "net.minecraft.world.entity.AgeableMob",
    "emissions": [
      {
        "particleId": "happy_villager",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(1.0)",
          "this.getRandomY() + 0.5",
          "this.getRandomZ(1.0)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "aiStep"
      }
    ]
  },
  "camel": {
    "className": "net.minecraft.world.entity.animal.camel.Camel",
    "emissions": [
      {
        "particleId": "happy_villager",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(1.0)",
          "this.getRandomY() + 0.5",
          "this.getRandomZ(1.0)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "handleEating"
      }
    ]
  },
  "allay": {
    "className": "net.minecraft.world.entity.animal.allay.Allay",
    "emissions": [
      {
        "particleId": "heart",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(1.0)",
          "this.getRandomY() + 0.5",
          "this.getRandomZ(1.0)"
        ],
        "velocityExpr": [
          "((Math.random() * 2 - 1) * 0.02)",
          "((Math.random() * 2 - 1) * 0.02)",
          "((Math.random() * 2 - 1) * 0.02)"
        ],
        "emissionSource": "spawnHeartParticle"
      }
    ]
  },
  "guardian": {
    "className": "net.minecraft.world.entity.monster.Guardian",
    "emissions": [
      {
        "particleId": "bubble",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(0.5) - $1.x * 1.5",
          "this.getRandomY() - $1.y * 1.5",
          "this.getRandomZ(0.5) - $1.z * 1.5"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "aiStep"
      },
      {
        "particleId": "bubble",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() + ($3.getX() - this.getX()) * ((Math.random()) += 1.8 - (this.getAttackAnimationScale(0.0)) + Math.random() * (1.7 - (this.getAttackAnimationScale(0.0))))",
          "this.getEyeY() + ($3.getY(0.5) - this.getEyeY()) * (Math.random())",
          "this.getZ() + ($3.getZ() - this.getZ()) * (Math.random())"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "aiStep"
      }
    ]
  },
  "mushroom_cow": {
    "className": "net.minecraft.world.entity.animal.cow.MushroomCow",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() + Math.random() / 2.0",
          "this.getY(0.5)",
          "this.getZ() + Math.random() / 2.0"
        ],
        "velocityExpr": [
          "0.0",
          "Math.random() / 5.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "mobInteract"
      }
    ]
  },
  "abstract_arrow": {
    "className": "net.minecraft.world.entity.projectile.arrow.AbstractArrow",
    "emissions": [
      {
        "particleId": "crit",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$7.x + $1.x * $8 / 4.0",
          "$7.y + $1.y * $8 / 4.0",
          "$7.z + $1.z * $8 / 4.0"
        ],
        "velocityExpr": [
          "-$1.x",
          "-$1.y + 0.2",
          "-$1.z"
        ],
        "loopCountExpr": "4",
        "loopIndexVar": "$8",
        "emissionSource": "tick"
      },
      {
        "particleId": "bubble",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$0.x - $1.x * 0.25",
          "$0.y - $1.y * 0.25",
          "$0.z - $1.z * 0.25"
        ],
        "velocityExpr": [
          "$1.x",
          "$1.y",
          "$1.z"
        ],
        "countExpr": "4",
        "emissionSource": "addBubbleParticles"
      }
    ]
  },
  "minecart_t_n_t": {
    "className": "net.minecraft.world.entity.vehicle.minecart.MinecartTNT",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX()",
          "this.getY() + 0.5",
          "this.getZ()"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "tick"
      }
    ]
  },
  "living_entity": {
    "className": "net.minecraft.world.entity.LivingEntity",
    "emissions": [
      {
        "particleId": "portal",
        "options": null,
        "condition": null,
        "positionExpr": [
          "(Mth.lerp(($3 / 127.0), this.xo, this.getX()) + (Math.random() - 0.5) * this.getBbWidth() * 2.0)",
          "(Mth.lerp(($3 / 127.0), this.yo, this.getY()) + Math.random() * this.getBbHeight())",
          "(Mth.lerp(($3 / 127.0), this.zo, this.getZ()) + (Math.random() - 0.5) * this.getBbWidth() * 2.0)"
        ],
        "velocityExpr": [
          "((Math.random() - 0.5) * 0.2)",
          "((Math.random() - 0.5) * 0.2)",
          "((Math.random() - 0.5) * 0.2)"
        ],
        "loopCountExpr": "128",
        "loopIndexVar": "$3",
        "emissionSource": "handleEntityEvent"
      },
      {
        "particleId": "poof",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(1.0) - ((Math.random() * 2 - 1) * 0.02) * 10.0",
          "this.getRandomY() - ((Math.random() * 2 - 1) * 0.02) * 10.0",
          "this.getRandomZ(1.0) - ((Math.random() * 2 - 1) * 0.02) * 10.0"
        ],
        "velocityExpr": [
          "((Math.random() * 2 - 1) * 0.02)",
          "((Math.random() * 2 - 1) * 0.02)",
          "((Math.random() * 2 - 1) * 0.02)"
        ],
        "countExpr": "20",
        "emissionSource": "makePoofParticles"
      },
      {
        "particleId": "bubble",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() + (this.random.triangle(0.0, 1.0))",
          "this.getY() + (this.random.triangle(0.0, 1.0))",
          "this.getZ() + (this.random.triangle(0.0, 1.0))"
        ],
        "velocityExpr": [
          "$0.x",
          "$0.y",
          "$0.z"
        ],
        "countExpr": "8",
        "emissionSource": "makeDrownParticles"
      }
    ]
  },
  "animal": {
    "className": "net.minecraft.world.entity.animal.Animal",
    "emissions": [
      {
        "particleId": "heart",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(1.0)",
          "this.getRandomY() + 0.5",
          "this.getRandomZ(1.0)"
        ],
        "velocityExpr": [
          "((Math.random() * 2 - 1) * 0.02)",
          "((Math.random() * 2 - 1) * 0.02)",
          "((Math.random() * 2 - 1) * 0.02)"
        ],
        "emissionSource": "aiStep"
      },
      {
        "particleId": "heart",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(1.0)",
          "this.getRandomY() + 0.5",
          "this.getRandomZ(1.0)"
        ],
        "velocityExpr": [
          "((Math.random() * 2 - 1) * 0.02)",
          "((Math.random() * 2 - 1) * 0.02)",
          "((Math.random() * 2 - 1) * 0.02)"
        ],
        "countExpr": "7",
        "emissionSource": "handleEntityEvent"
      }
    ]
  },
  "minecart_furnace": {
    "className": "net.minecraft.world.entity.vehicle.minecart.MinecartFurnace",
    "emissions": [
      {
        "particleId": "large_smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX()",
          "this.getY() + 0.8",
          "this.getZ()"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "probabilityExpr": "this.random.nextInt(4) == 0",
        "emissionSource": "tick"
      }
    ]
  },
  "abstract_horse": {
    "className": "net.minecraft.world.entity.animal.equine.AbstractHorse",
    "emissions": [
      {
        "particleId": "happy_villager",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(1.0)",
          "this.getRandomY() + 0.5",
          "this.getRandomZ(1.0)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "handleEating"
      }
    ]
  },
  "throwable_projectile": {
    "className": "net.minecraft.world.entity.projectile.ThrowableProjectile",
    "emissions": [
      {
        "particleId": "bubble",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$1.x - $0.x * 0.25",
          "$1.y - $0.y * 0.25",
          "$1.z - $0.z * 0.25"
        ],
        "velocityExpr": [
          "$0.x",
          "$0.y",
          "$0.z"
        ],
        "countExpr": "4",
        "emissionSource": "applyInertia"
      }
    ]
  },
  "evoker_fangs": {
    "className": "net.minecraft.world.entity.projectile.EvokerFangs",
    "emissions": [
      {
        "particleId": "crit",
        "options": null,
        "condition": null,
        "positionExpr": [
          "(this.getX() + (Math.random() * 2.0 - 1.0) * this.getBbWidth() * 0.5)",
          "(this.getY() + 0.05 + Math.random()) + 1.0",
          "(this.getZ() + (Math.random() * 2.0 - 1.0) * this.getBbWidth() * 0.5)"
        ],
        "velocityExpr": [
          "((Math.random() * 2.0 - 1.0) * 0.3)",
          "(0.3 + Math.random() * 0.3)",
          "((Math.random() * 2.0 - 1.0) * 0.3)"
        ],
        "countExpr": "12",
        "emissionSource": "tick"
      }
    ]
  },
  "ravager": {
    "className": "net.minecraft.world.entity.monster.Ravager",
    "emissions": [
      {
        "particleId": "poof",
        "options": null,
        "condition": null,
        "positionExpr": [
          "$0.x",
          "$0.y",
          "$0.z"
        ],
        "velocityExpr": [
          "((Math.random() * 2 - 1) * 0.2)",
          "((Math.random() * 2 - 1) * 0.2)",
          "((Math.random() * 2 - 1) * 0.2)"
        ],
        "countExpr": "40",
        "emissionSource": "addRoarParticleEffects"
      }
    ]
  },
  "squid": {
    "className": "net.minecraft.world.entity.animal.squid.Squid",
    "emissions": [
      {
        "particleId": "bubble",
        "options": null,
        "condition": null,
        "positionExpr": [
          "cxq.this.getX()",
          "cxq.this.getY()",
          "cxq.this.getZ()"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "tick"
      }
    ]
  },
  "illusioner": {
    "className": "net.minecraft.world.entity.monster.illager.Illusioner",
    "emissions": [
      {
        "particleId": "cloud",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getRandomX(0.5)",
          "this.getRandomY()",
          "this.getZ(0.5)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "16",
        "emissionSource": "aiStep"
      }
    ]
  },
  "dolphin": {
    "className": "net.minecraft.world.entity.animal.dolphin.Dolphin",
    "emissions": [
      {
        "particleId": "dolphin",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() - $0.x * (1.2 - Math.random() * 0.7) + (Mth.cos((this.getYRot() * (Math.PI / 180))) * 0.3)",
          "this.getY() - $0.y",
          "this.getZ() - $0.z * (1.2 - Math.random() * 0.7) + (Mth.sin((this.getYRot() * (Math.PI / 180))) * 0.3)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "tick"
      },
      {
        "particleId": "dolphin",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() - $0.x * (1.2 - Math.random() * 0.7) - (Mth.cos((this.getYRot() * (Math.PI / 180))) * 0.3)",
          "this.getY() - $0.y",
          "this.getZ() - $0.z * (1.2 - Math.random() * 0.7) - (Mth.sin((this.getYRot() * (Math.PI / 180))) * 0.3)"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "countExpr": "2",
        "emissionSource": "tick"
      }
    ]
  },
  "abstract_nautilus": {
    "className": "net.minecraft.world.entity.animal.nautilus.AbstractNautilus",
    "emissions": [
      {
        "particleId": "bubble",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() - $4.x * 1.1",
          "this.getY() - $4.y + 0.25",
          "this.getZ() - $4.z * 1.1"
        ],
        "velocityExpr": [
          "((Math.random() - 0.5) * (Math.random() * 0.8 * (1.0 + (this.getDeltaMovement().length()))))",
          "((Math.random() - 0.5) * (Math.random() * 0.8 * (1.0 + (this.getDeltaMovement().length()))))",
          "((Math.random() - 0.5) * (Math.random() * 0.8 * (1.0 + (this.getDeltaMovement().length()))))"
        ],
        "probabilityExpr": "Math.random() < $1",
        "emissionSource": "spawnBubbles"
      }
    ]
  },
  "shulker_bullet": {
    "className": "net.minecraft.world.entity.projectile.ShulkerBullet",
    "emissions": [
      {
        "particleId": "end_rod",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() - $3.x",
          "this.getY() - $3.y + 0.15",
          "this.getZ() - $3.z"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "tick"
      }
    ]
  },
  "primed_tnt": {
    "className": "net.minecraft.world.entity.item.PrimedTnt",
    "emissions": [
      {
        "particleId": "smoke",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX()",
          "this.getY() + 0.5",
          "this.getZ()"
        ],
        "velocityExpr": [
          "0.0",
          "0.0",
          "0.0"
        ],
        "emissionSource": "tick"
      }
    ]
  },
  "panda": {
    "className": "net.minecraft.world.entity.animal.panda.Panda",
    "emissions": [
      {
        "particleId": "sneeze",
        "options": null,
        "condition": null,
        "positionExpr": [
          "this.getX() - (this.getBbWidth() + 1.0) * 0.5 * Mth.sin((this.yBodyRot * (Math.PI / 180)))",
          "this.getEyeY() - 0.1",
          "this.getZ() + (this.getBbWidth() + 1.0) * 0.5 * Mth.cos((this.yBodyRot * (Math.PI / 180)))"
        ],
        "velocityExpr": [
          "$0.x",
          "0.0",
          "$0.z"
        ],
        "emissionSource": "afterSneeze"
      }
    ]
  }
},
  particles: {
  "rain": {
    "textures": [
      "splash_0",
      "splash_1",
      "splash_2",
      "splash_3"
    ]
  },
  "dolphin": {
    "textures": [
      "generic_0"
    ]
  },
  "firefly": {
    "textures": [
      "firefly"
    ]
  },
  "splash": {
    "textures": [
      "splash_0",
      "splash_1",
      "splash_2",
      "splash_3"
    ]
  },
  "scrape": {
    "textures": [
      "glow"
    ]
  },
  "flame": {
    "textures": [
      "flame"
    ]
  },
  "underwater": {
    "textures": [
      "generic_0"
    ]
  },
  "dripping_water": {
    "textures": [
      "drip_hang"
    ]
  },
  "sculk_soul": {
    "textures": [
      "sculk_soul_0",
      "sculk_soul_1",
      "sculk_soul_2",
      "sculk_soul_3",
      "sculk_soul_4",
      "sculk_soul_5",
      "sculk_soul_6",
      "sculk_soul_7",
      "sculk_soul_8",
      "sculk_soul_9",
      "sculk_soul_10"
    ]
  },
  "note": {
    "textures": [
      "note"
    ]
  },
  "current_down": {
    "textures": [
      "bubble"
    ]
  },
  "spore_blossom_air": {
    "textures": [
      "drip_fall"
    ]
  },
  "enchant": {
    "textures": [
      "sga_a",
      "sga_b",
      "sga_c",
      "sga_d",
      "sga_e",
      "sga_f",
      "sga_g",
      "sga_h",
      "sga_i",
      "sga_j",
      "sga_k",
      "sga_l",
      "sga_m",
      "sga_n",
      "sga_o",
      "sga_p",
      "sga_q",
      "sga_r",
      "sga_s",
      "sga_t",
      "sga_u",
      "sga_v",
      "sga_w",
      "sga_x",
      "sga_y",
      "sga_z"
    ]
  },
  "bubble_pop": {
    "textures": [
      "bubble_pop_0",
      "bubble_pop_1",
      "bubble_pop_2",
      "bubble_pop_3",
      "bubble_pop_4"
    ]
  },
  "sneeze": {
    "textures": [
      "generic_7",
      "generic_6",
      "generic_5",
      "generic_4",
      "generic_3",
      "generic_2",
      "generic_1",
      "generic_0"
    ]
  },
  "large_smoke": {
    "textures": [
      "generic_7",
      "generic_6",
      "generic_5",
      "generic_4",
      "generic_3",
      "generic_2",
      "generic_1",
      "generic_0"
    ]
  },
  "nautilus": {
    "textures": [
      "nautilus"
    ]
  },
  "dripping_obsidian_tear": {
    "textures": [
      "drip_hang"
    ]
  },
  "trail": {
    "textures": [
      "generic_0"
    ]
  },
  "campfire_signal_smoke": {
    "textures": [
      "big_smoke_0",
      "big_smoke_1",
      "big_smoke_2",
      "big_smoke_3",
      "big_smoke_4",
      "big_smoke_5",
      "big_smoke_6",
      "big_smoke_7",
      "big_smoke_8",
      "big_smoke_9",
      "big_smoke_10",
      "big_smoke_11"
    ]
  },
  "dripping_honey": {
    "textures": [
      "drip_hang"
    ]
  },
  "trial_omen": {
    "textures": [
      "trial_omen"
    ]
  },
  "wax_off": {
    "textures": [
      "glow"
    ]
  },
  "angry_villager": {
    "textures": [
      "angry"
    ]
  },
  "lava": {
    "textures": [
      "lava"
    ]
  },
  "happy_villager": {
    "textures": [
      "glint"
    ]
  },
  "soul": {
    "textures": [
      "soul_0",
      "soul_1",
      "soul_2",
      "soul_3",
      "soul_4",
      "soul_5",
      "soul_6",
      "soul_7",
      "soul_8",
      "soul_9",
      "soul_10"
    ]
  },
  "sweep_attack": {
    "textures": [
      "sweep_0",
      "sweep_1",
      "sweep_2",
      "sweep_3",
      "sweep_4",
      "sweep_5",
      "sweep_6",
      "sweep_7"
    ]
  },
  "dripping_lava": {
    "textures": [
      "drip_hang"
    ]
  },
  "white_ash": {
    "textures": [
      "generic_0"
    ]
  },
  "poof": {
    "textures": [
      "generic_7",
      "generic_6",
      "generic_5",
      "generic_4",
      "generic_3",
      "generic_2",
      "generic_1",
      "generic_0"
    ]
  },
  "falling_lava": {
    "textures": [
      "drip_fall"
    ]
  },
  "electric_spark": {
    "textures": [
      "glow"
    ]
  },
  "falling_dust": {
    "textures": [
      "generic_7",
      "generic_6",
      "generic_5",
      "generic_4",
      "generic_3",
      "generic_2",
      "generic_1",
      "generic_0"
    ]
  },
  "campfire_cosy_smoke": {
    "textures": [
      "big_smoke_0",
      "big_smoke_1",
      "big_smoke_2",
      "big_smoke_3",
      "big_smoke_4",
      "big_smoke_5",
      "big_smoke_6",
      "big_smoke_7",
      "big_smoke_8",
      "big_smoke_9",
      "big_smoke_10",
      "big_smoke_11"
    ]
  },
  "sonic_boom": {
    "textures": [
      "sonic_boom_0",
      "sonic_boom_1",
      "sonic_boom_2",
      "sonic_boom_3",
      "sonic_boom_4",
      "sonic_boom_5",
      "sonic_boom_6",
      "sonic_boom_7",
      "sonic_boom_8",
      "sonic_boom_9",
      "sonic_boom_10",
      "sonic_boom_11",
      "sonic_boom_12",
      "sonic_boom_13",
      "sonic_boom_14",
      "sonic_boom_15"
    ]
  },
  "effect": {
    "textures": [
      "effect_7",
      "effect_6",
      "effect_5",
      "effect_4",
      "effect_3",
      "effect_2",
      "effect_1",
      "effect_0"
    ]
  },
  "entity_effect": {
    "textures": [
      "effect_7",
      "effect_6",
      "effect_5",
      "effect_4",
      "effect_3",
      "effect_2",
      "effect_1",
      "effect_0"
    ]
  },
  "falling_water": {
    "textures": [
      "drip_fall"
    ]
  },
  "falling_dripstone_lava": {
    "textures": [
      "drip_fall"
    ]
  },
  "ambient_entity_effect": {
    "textures": [
      "effect_7",
      "effect_6",
      "effect_5",
      "effect_4",
      "effect_3",
      "effect_2",
      "effect_1",
      "effect_0"
    ]
  },
  "falling_dripstone_water": {
    "textures": [
      "drip_fall"
    ]
  },
  "reverse_portal": {
    "textures": [
      "generic_0",
      "generic_1",
      "generic_2",
      "generic_3",
      "generic_4",
      "generic_5",
      "generic_6",
      "generic_7"
    ]
  },
  "dripping_dripstone_water": {
    "textures": [
      "drip_hang"
    ]
  },
  "pale_oak_leaves": {
    "textures": [
      "pale_oak_0",
      "pale_oak_1",
      "pale_oak_2",
      "pale_oak_3",
      "pale_oak_4",
      "pale_oak_5",
      "pale_oak_6",
      "pale_oak_7",
      "pale_oak_8",
      "pale_oak_9",
      "pale_oak_10",
      "pale_oak_11"
    ]
  },
  "snowflake": {
    "textures": [
      "generic_7",
      "generic_6",
      "generic_5",
      "generic_4",
      "generic_3",
      "generic_2",
      "generic_1",
      "generic_0"
    ]
  },
  "fishing": {
    "textures": [
      "splash_0",
      "splash_1",
      "splash_2",
      "splash_3"
    ]
  },
  "sculk_charge_pop": {
    "textures": [
      "sculk_charge_pop_0",
      "sculk_charge_pop_1",
      "sculk_charge_pop_2",
      "sculk_charge_pop_3"
    ]
  },
  "witch": {
    "textures": [
      "spell_7",
      "spell_6",
      "spell_5",
      "spell_4",
      "spell_3",
      "spell_2",
      "spell_1",
      "spell_0"
    ]
  },
  "crimson_spore": {
    "textures": [
      "generic_0"
    ]
  },
  "firework": {
    "textures": [
      "spark_7",
      "spark_6",
      "spark_5",
      "spark_4",
      "spark_3",
      "spark_2",
      "spark_1",
      "spark_0"
    ]
  },
  "sculk_charge": {
    "textures": [
      "sculk_charge_0",
      "sculk_charge_1",
      "sculk_charge_2",
      "sculk_charge_3",
      "sculk_charge_4",
      "sculk_charge_5",
      "sculk_charge_6"
    ]
  },
  "end_rod": {
    "textures": [
      "glitter_7",
      "glitter_6",
      "glitter_5",
      "glitter_4",
      "glitter_3",
      "glitter_2",
      "glitter_1",
      "glitter_0"
    ]
  },
  "dust_color_transition": {
    "textures": [
      "generic_7",
      "generic_6",
      "generic_5",
      "generic_4",
      "generic_3",
      "generic_2",
      "generic_1",
      "generic_0"
    ]
  },
  "ominous_spawning": {
    "textures": [
      "ominous_spawning"
    ]
  },
  "landing_honey": {
    "textures": [
      "drip_land"
    ]
  },
  "ash": {
    "textures": [
      "generic_0"
    ]
  },
  "vibration": {
    "textures": [
      "vibration"
    ]
  },
  "composter": {
    "textures": [
      "glint"
    ]
  },
  "squid_ink": {
    "textures": [
      "generic_7",
      "generic_6",
      "generic_5",
      "generic_4",
      "generic_3",
      "generic_2",
      "generic_1",
      "generic_0"
    ]
  },
  "dust_plume": {
    "textures": [
      "generic_7",
      "generic_6",
      "generic_5",
      "generic_4",
      "generic_3",
      "generic_2",
      "generic_1",
      "generic_0"
    ]
  },
  "bubble_column_up": {
    "textures": [
      "bubble"
    ]
  },
  "spit": {
    "textures": [
      "generic_7",
      "generic_6",
      "generic_5",
      "generic_4",
      "generic_3",
      "generic_2",
      "generic_1",
      "generic_0"
    ]
  },
  "wax_on": {
    "textures": [
      "glow"
    ]
  },
  "heart": {
    "textures": [
      "heart"
    ]
  },
  "gust": {
    "textures": [
      "gust_0",
      "gust_1",
      "gust_2",
      "gust_3",
      "gust_4",
      "gust_5",
      "gust_6",
      "gust_7",
      "gust_8",
      "gust_9",
      "gust_10",
      "gust_11"
    ]
  },
  "small_gust": {
    "textures": [
      "small_gust_0",
      "small_gust_1",
      "small_gust_2",
      "small_gust_3",
      "small_gust_4",
      "small_gust_5",
      "small_gust_6"
    ]
  },
  "cloud": {
    "textures": [
      "generic_7",
      "generic_6",
      "generic_5",
      "generic_4",
      "generic_3",
      "generic_2",
      "generic_1",
      "generic_0"
    ]
  },
  "enchanted_hit": {
    "textures": [
      "enchanted_hit"
    ]
  },
  "egg_crack": {
    "textures": [
      "glint"
    ]
  },
  "instant_effect": {
    "textures": [
      "spell_7",
      "spell_6",
      "spell_5",
      "spell_4",
      "spell_3",
      "spell_2",
      "spell_1",
      "spell_0"
    ]
  },
  "crit": {
    "textures": [
      "critical_hit"
    ]
  },
  "glow": {
    "textures": [
      "glow"
    ]
  },
  "raid_omen": {
    "textures": [
      "raid_omen"
    ]
  },
  "tinted_leaves": {
    "textures": [
      "leaf_0",
      "leaf_1",
      "leaf_2",
      "leaf_3",
      "leaf_4",
      "leaf_5",
      "leaf_6",
      "leaf_7",
      "leaf_8",
      "leaf_9",
      "leaf_10",
      "leaf_11"
    ]
  },
  "falling_nectar": {
    "textures": [
      "drip_fall"
    ]
  },
  "vault_connection": {
    "textures": [
      "vault_connection"
    ]
  },
  "dust": {
    "textures": [
      "generic_7",
      "generic_6",
      "generic_5",
      "generic_4",
      "generic_3",
      "generic_2",
      "generic_1",
      "generic_0"
    ]
  },
  "glow_squid_ink": {
    "textures": [
      "generic_7",
      "generic_6",
      "generic_5",
      "generic_4",
      "generic_3",
      "generic_2",
      "generic_1",
      "generic_0"
    ]
  },
  "explosion": {
    "textures": [
      "explosion_0",
      "explosion_1",
      "explosion_2",
      "explosion_3",
      "explosion_4",
      "explosion_5",
      "explosion_6",
      "explosion_7",
      "explosion_8",
      "explosion_9",
      "explosion_10",
      "explosion_11",
      "explosion_12",
      "explosion_13",
      "explosion_14",
      "explosion_15"
    ]
  },
  "trial_spawner_detection_ominous": {
    "textures": [
      "trial_spawner_detection_ominous_0",
      "trial_spawner_detection_ominous_1",
      "trial_spawner_detection_ominous_2",
      "trial_spawner_detection_ominous_3",
      "trial_spawner_detection_ominous_4"
    ]
  },
  "landing_obsidian_tear": {
    "textures": [
      "drip_land"
    ]
  },
  "trial_spawner_detection": {
    "textures": [
      "trial_spawner_detection_0",
      "trial_spawner_detection_1",
      "trial_spawner_detection_2",
      "trial_spawner_detection_3",
      "trial_spawner_detection_4"
    ]
  },
  "infested": {
    "textures": [
      "infested"
    ]
  },
  "white_smoke": {
    "textures": [
      "generic_7",
      "generic_6",
      "generic_5",
      "generic_4",
      "generic_3",
      "generic_2",
      "generic_1",
      "generic_0"
    ]
  },
  "damage_indicator": {
    "textures": [
      "damage"
    ]
  },
  "dragon_breath": {
    "textures": [
      "generic_5",
      "generic_6",
      "generic_7"
    ]
  },
  "bubble": {
    "textures": [
      "bubble"
    ]
  },
  "copper_fire_flame": {
    "textures": [
      "copper_fire_flame"
    ]
  },
  "falling_obsidian_tear": {
    "textures": [
      "drip_fall"
    ]
  },
  "mycelium": {
    "textures": [
      "generic_0"
    ]
  },
  "warped_spore": {
    "textures": [
      "generic_0"
    ]
  },
  "soul_fire_flame": {
    "textures": [
      "soul_fire_flame"
    ]
  },
  "dripping_dripstone_lava": {
    "textures": [
      "drip_hang"
    ]
  },
  "portal": {
    "textures": [
      "generic_0",
      "generic_1",
      "generic_2",
      "generic_3",
      "generic_4",
      "generic_5",
      "generic_6",
      "generic_7"
    ]
  },
  "shriek": {
    "textures": [
      "shriek"
    ]
  },
  "smoke": {
    "textures": [
      "generic_7",
      "generic_6",
      "generic_5",
      "generic_4",
      "generic_3",
      "generic_2",
      "generic_1",
      "generic_0"
    ]
  },
  "small_flame": {
    "textures": [
      "flame"
    ]
  },
  "falling_honey": {
    "textures": [
      "drip_fall"
    ]
  },
  "landing_lava": {
    "textures": [
      "drip_land"
    ]
  },
  "falling_spore_blossom": {
    "textures": [
      "drip_fall"
    ]
  },
  "totem_of_undying": {
    "textures": [
      "glitter_7",
      "glitter_6",
      "glitter_5",
      "glitter_4",
      "glitter_3",
      "glitter_2",
      "glitter_1",
      "glitter_0"
    ]
  },
  "flash": {
    "textures": [
      "flash"
    ]
  },
  "cherry_leaves": {
    "textures": [
      "cherry_0",
      "cherry_1",
      "cherry_2",
      "cherry_3",
      "cherry_4",
      "cherry_5",
      "cherry_6",
      "cherry_7",
      "cherry_8",
      "cherry_9",
      "cherry_10",
      "cherry_11"
    ]
  }
},
};
