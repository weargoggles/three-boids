precision highp float;
uniform vec3 light;

varying vec3 vPosition;
varying vec3 v_ecNormal;

void main() {
    vec3 vColour = vec3(0.9, 0.9, 0.9);

    vec3 ecNormal = v_ecNormal / length(v_ecNormal);

    vec3 relativeLight = light - vPosition;

    float ecNormalDotLightDirection = max(0.0, dot(ecNormal, normalize(relativeLight)));

    gl_FragColor = vec4(ecNormalDotLightDirection * vColour, 1.0);
}
