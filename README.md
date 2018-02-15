# Double Pendulum Animation

This is a JavaScript animation of a [double pendulum][dp0] chaotic system.
WebGL rendering is used by default, falling back to plain old canvas rendering
if unavailable.

## Key bindings:

* <kbd>a</kbd>: add a new random pendulum
* <kbd>c</kbd>: imperfectly clone an existing pendulum
* <kbd>d</kbd>: delete the most recently added pendulum
* <kbd>m</kbd>: toggle between WebGL and Canvas rendering
* <kbd>SPACE</kbd>: pause the simulation

See also:

* [Lorenz System Demo][lz]
* [Double Pendulum -- from Eric Weisstein's World of Physics][dp1]
* [The double pendulum: Hamiltonian formulation - Diego Assencio][dp2]

[dp0]: https://en.wikipedia.org/wiki/Double_pendulum
[dp1]: http://scienceworld.wolfram.com/physics/DoublePendulum.html
[dp2]: https://diego.assencio.com/?index=e5ac36fcb129ce95a61f8e8ce0572dbf
[lz]: https://github.com/skeeto/lorenz-webgl
