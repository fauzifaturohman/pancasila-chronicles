'use strict';

class DialogSystem {
  constructor(doms, opts = {}) {
    this.elDialog = doms.dialog;
    this.elName = doms.name;
    this.elText = doms.text;
    this.elChoices = doms.choices;
    this.elHint = doms.hint;
    this.active = false;
    this.nodes = [];
    this.index = 0;
    this.speaker = '';
    this.choiceMode = false;
    this.onChoice = opts.onChoice || null;
    this.onComplete = opts.onComplete || null;
  }
  start(speaker, nodes, opts = {}) {
    this.speaker = speaker;
    this.nodes = nodes.map(n => (typeof n === 'string' ? { text: n } : n));
    this.index = 0;
    this.active = true;
    this.onChoice = opts.onChoice || null;
    this.onComplete = opts.onComplete || null;
    this.elName.textContent = speaker;
    this.elDialog.classList.remove('hidden');
    this._renderNode();
  }
  _renderNode() {
    const node = this.nodes[this.index];
    if (!node) { this.close(); return; }
    this.elText.textContent = node.text || '...';
    this.elChoices.innerHTML = '';
    this.elChoices.classList.add('hidden');
    this.choiceMode = false;

    if (node.choices?.length) {
      this.choiceMode = true;
      this.elHint.classList.add('hidden');
      this.elChoices.classList.remove('hidden');
      node.choices.forEach((c, i) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        let inner = `<span class="choice-text">${c.text}</span>`;
        if (c.karma) {
          inner += '<span class="choice-karma">' + Object.entries(c.karma).map(([k,v]) => {
            const icon = KARMA_PILLARS[k]?.icon || '●';
            const sign = v > 0 ? '+' : '';
            const cls = v > 0 ? 'karma-plus' : 'karma-minus';
            return `<span class="karma-preview ${cls}">${icon}${sign}${v}</span>`;
          }).join('') + '</span>';
        }
        btn.innerHTML = inner;
        btn.addEventListener('click', () => this._pick(i));
        this.elChoices.appendChild(btn);
      });
    } else {
      this.elHint.classList.remove('hidden');
    }
  }
  advance() {
    if (!this.active || this.choiceMode) return;
    this.index++;
    if (this.index >= this.nodes.length) { this.close(); return; }
    this._renderNode();
  }
  _pick(i) {
    const node = this.nodes[this.index];
    const choice = node.choices[i];
    if (!choice) return;
    if (this.onChoice) this.onChoice(choice, node);
    if (choice.next === undefined || choice.next === -1) this.close();
    else { this.index = choice.next; this._renderNode(); }
  }
  close() {
    this.active = false;
    this.choiceMode = false;
    this.elDialog.classList.add('hidden');
    this.elChoices.innerHTML = '';
    const cb = this.onComplete;
    this.onComplete = null;
    if (cb) cb();
  }
}
