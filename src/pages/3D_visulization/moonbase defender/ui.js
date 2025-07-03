export function setupUI() {
  if (!document.getElementById('crystal-counter')) {
    const counterDiv = document.createElement('div');
    counterDiv.id = 'crystal-counter';
    counterDiv.style.cssText = 'position:fixed;top:20px;right:20px;color:white;font-size:20px;z-index:1000;font-family:monospace';
    document.body.appendChild(counterDiv);
  }
}

export function updateCrystalCounter() {
  const count = (window.crystalData || []).filter(d => d.activated).length;
  const total = (window.crystalData || []).length;
  document.getElementById('crystal-counter').textContent = `Crystals Activated: ${count} / ${total}`;
}

export function showActivationPrompt(playerPos, crystalData) {
  const prompt = document.getElementById('activation-prompt');
  const near = crystalData.some(data =>
    !data.activated && data.object.position.distanceTo(playerPos) < 6
  );
  prompt.style.display = near ? 'block' : 'none';
}
