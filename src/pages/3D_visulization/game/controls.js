export function setupKeyControls(keysMap) {
  const keys = {};
  let target = null;

  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  const speed = 0.05;

  function update() {
    if (!target) return;

    if (keys[keysMap.up])   target.position.y += speed;
    if (keys[keysMap.down]) target.position.y -= speed;
  }

  function setTarget(object) {
    target = object;
  }

  return { update, setTarget };
}
