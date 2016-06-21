precision highp float;
uniform vec3 light;
uniform vec3 colour;

varying vec3 vPosition;
varying vec3 v_ecNormal;

void main() {
//    vec3 vColour = colour;

    vec3 ecNormal = v_ecNormal / length(v_ecNormal);

    vec3 relativeLight = light - vPosition;

    float ecNormalDotLightDirection = max(0.0, dot(ecNormal, normalize(relativeLight)));

    gl_FragColor = vec4(ecNormalDotLightDirection * colour, 1.0);
}
