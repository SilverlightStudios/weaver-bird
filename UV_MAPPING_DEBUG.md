# UV Mapping Debug

## The Issue
The cow model is rendering but with incorrect UV mapping - textures are swapped or rotated on faces.

## Current Implementation
In `applyUVs()`, we map Three.js BoxGeometry face indices to JEM face names:
```
0: east (+X)
1: west (-X) 
2: up (+Y)
3: down (-Y)
4: south (+Z)
5: north (-Z)
```

## Standard Minecraft UV Layout
From the calculateBoxUV comment, the textureOffset-based layout is:
```
       u      u+d     u+d+w   u+d+w+d  u+2d+2w
   v   +------+-------+-------+--------+
       |      |  Up   | Down  |        |   d (depth)
   v+d +------+-------+-------+--------+
       | East | North | West  | South  |   h (height)
 v+d+h +------+-------+-------+--------+
          d      w       d       w
```

Where: d = depth (Z), w = width (X), h = height (Y)

## Hypothesis
The issue might be:
1. The Three.js face indices don't match the BoxGeometry vertex layout
2. The UV coordinate mapping (u1, v1, u2, v2) ordering is incorrect
3. The V-flip logic is wrong (should it flip or not?)
4. The left-right orientation doesn't match

## Test Steps
1. Look at the cow head textureOffset: [0, 0]
   - Box coordinates: [-4, 16, -14, 8, 8, 6]
   - Width=8, Height=8, Depth=6
   
2. Expected UV layout for this box:
   - Up: [0+6=6, 0, 0+6+8=14, 0+6=6]     = [6, 0, 14, 6]
   - Down: [0+6+8=14, 0, 0+6+8+8=22, 0+6=6] = [14, 0, 22, 6]
   - East: [0, 6, 0+6=6, 6+8=14]          = [0, 6, 6, 14]
   - North: [6, 6, 6+8=14, 14]            = [6, 6, 14, 14]
   - West: [14, 6, 14+6=20, 14]           = [14, 6, 20, 14]
   - South: [20, 6, 20+8=28, 14]          = [20, 6, 28, 14]

## Debugging Questions
- Are the face indices correct? (Which Three.js BoxGeometry index corresponds to which face?)
- Is the UV rectangle [u1, v1, u2, v2] correctly interpreted?
- Should we flip V? (Minecraft textures have Y=0 at top, but Three.js might differ)
