(() => {
  const replacements = [
    [
      'Theory questions, practical sequence drills, progress tracking, and motivational commentary from the man who has complete faith in you—even when he is outside taking a smoke break.',
      'Theory questions, practical sequence drills, progress tracking, and motivational commentary from the man who has complete faith in you—and built this just for you.'
    ],
    [
      'Five in a row. Dad is proud and probably overdue for a smoke break.',
      'Five in a row. Dad is proud, and your brain is officially cooking.'
    ]
  ];

  const cleanCopy = () => {
    const root = document.getElementById('app');
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let text = node.nodeValue;
      replacements.forEach(([from, to]) => { text = text.replace(from, to); });
      node.nodeValue = text;
    });
  };

  cleanCopy();
  const observer = new MutationObserver(cleanCopy);
  observer.observe(document.getElementById('app'), { childList: true, subtree: true });
})();
