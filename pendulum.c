/* Double Pendulum
 * Ref: http://scienceworld.wolfram.com/physics/DoublePendulum.html */
#include <math.h>
#include <time.h>
#include <stdio.h>
#include <stdint.h>

#define G    3.0
#define M1   1.5
#define M2   1.0
#define L1   1.0
#define L2   1.25
#define PI   3.141592653589793

static uint64_t
splitmix64(uint64_t *x)
{
    uint64_t z = (*x += UINT64_C(0x9e3779b97f4a7c15));
    z = (z ^ (z >> 30)) * UINT64_C(0xbf58476d1ce4e5b9);
    z = (z ^ (z >> 27)) * UINT64_C(0x94d049bb133111eb);
    return z ^ (z >> 31);
}

static double
uniform(uint64_t *rng)
{
    return splitmix64(rng) / (double)UINT64_MAX;
}

struct state {
    double a1;
    double a2;
    double p1;
    double p2;
};

static struct state
state_generate(uint64_t *rng)
{
    struct state s;
    s.a1 = uniform(rng) * PI + PI / 2;
    s.a2 = uniform(rng) * PI + PI / 2;
    s.p1 = 0;
    s.p2 = 0;
    return s;
}

static struct state
state_delta(struct state s)
{
    double a1 = s.a1;
    double a2 = s.a2;
    double p1 = s.p1;
    double p2 = s.p2;
    double cos12 = cos(a1 - a2);
    double sin12 = sin(a1 - a2);
    double c1 = (p1 * p2 * sin12) / (L1 * L2 * (M1 + M2 * sin12 * sin12));
    double c2 = sin(2 * (a1 - a2)) *
                (L2 * L2 * M2 * p1 * p1 +
                 L1 * L1 * (M1 + M2) * p2 * p2 -
                 L1 * L2 * M2 * p1 * p2 * cos12) /
                (2 * L1 * L1 * L2 * L2 *
                 (M1 + M2 * sin12 * sin12) *
                 (M1 + M2 * sin12 * sin12));
    struct state d;
    d.a1 = (L2 * p1 - L1 * p2 * cos12) /
           (L1 * L1 * L2 * (M1 + M2 * sin12 * sin12));
    d.a2 = (L1 * (M1 + M2) * p2 - L2 * M2 * p1 * cos12) /
           (L1 * L2 * L2 * M2 * (M1 + M2 * sin12 * sin12));
    d.p1 = -(M1 + M2) * G * L1 * sin(a1) - c1 + c2;
    d.p2 = -M2 * G * L2 * sin(a2) + c1 - c2;
    return d;
}

static struct state
state_rk4(struct state k1, double dt)
{
    struct state dk1, k2, dk2, k3, dk3, k4, dk4, o;

    dk1 = state_delta(k1);

    k2.a1 = k1.a1 + dk1.a1 * dt / 2;
    k2.a2 = k1.a2 + dk1.a2 * dt / 2;
    k2.p1 = k1.p1 + dk1.p1 * dt / 2;
    k2.p2 = k1.p2 + dk1.p2 * dt / 2;

    dk2 = state_delta(k2);

    k3.a1 = k1.a1 + dk2.a1 * dt / 2;
    k3.a2 = k1.a2 + dk2.a2 * dt / 2;
    k3.p1 = k1.p1 + dk2.p1 * dt / 2;
    k3.p2 = k1.p2 + dk2.p2 * dt / 2;

    dk3 = state_delta(k3);

    k4.a1 = k1.a1 + dk3.a1 * dt;
    k4.a2 = k1.a2 + dk3.a2 * dt;
    k4.p1 = k1.p1 + dk3.p1 * dt;
    k4.p2 = k1.p2 + dk3.p2 * dt;

    dk4 = state_delta(k4);

    o.a1 = k1.a1 + (dk1.a1 + 2 * dk2.a1 + 2 * dk3.a1 + dk4.a1) * dt / 6;
    o.a2 = k1.a2 + (dk1.a2 + 2 * dk2.a2 + 2 * dk3.a2 + dk4.a2) * dt / 6;
    o.p1 = k1.p1 + (dk1.p1 + 2 * dk2.p1 + 2 * dk3.p1 + dk4.p1) * dt / 6;
    o.p2 = k1.p2 + (dk1.p2 + 2 * dk2.p2 + 2 * dk3.p2 + dk4.p2) * dt / 6;
    return o;
}

static double
state_energy(struct state s)
{
    struct state d = state_delta(s);
    double pe = -(M1 + M2) * G * L1 * cos(s.a1) - M2 * G * L2 * cos(s.a2);
    double ke = M1 / 2 * L1 * L1 * d.a1 * d.a1 +
                M2 / 2 * (L1 * L1 * d.a1 * d.a1 +
                          L2 * L2 * d.a2 * d.a2 +
                          2 * L1 * L2 * d.a1 * d.a2 * cos(s.a1 - s.a2));
    return pe + ke;
}

int
main(void)
{
    uint64_t rng[1] = {time(0)};
    struct state s = state_generate(rng);
    for (;;) {
        s = state_rk4(s, 1 / 60.0);
        double e = state_energy(s);
        printf("%- 16.8f %f %f\n", e, s.a1, s.a2);
    }
}
