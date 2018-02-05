#!/usr/bin/octave -q
L1 = 1.0;
L2 = 1.25;
M1 = 1.5;
M2 = 1.0;
d = dlmread('/tmp/x');
s = 1;
for i = s:length(d)
    a0 = d(s:i, 2);
    a1 = d(s:i, 3);
    x0 = sin(a0) * L1;
    y0 = cos(a0) * L1;
    x1 = sin(a1) * L2 + x0;
    y1 = cos(a1) * L2 + y0;
    clf();
    xlim([-(L1 + L2) (L1 + L2)]);
    ylim([-(L1 + L2) (L1 + L2)]);
    axis('square');
    hold('on');
    plot(x1, -y1, '-r', 'linewidth', 2);
    plot([0 x0(end) x1(end)], [0 -y0(end) -y1(end)], '-k', 'linewidth', 3);
    plot(x0(end), -y0(end), '.b', 'markersize', 20 * M1);
    plot(x1(end), -y1(end), '.b', 'markersize', 20 * M2);
    hold('off');
    drawnow();
end
