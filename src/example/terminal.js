import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { interpret } from './state.js';

export function createTerminal(container, getState, c, onClose) {
  const terminal = new Terminal({ cursorBlink: false, fontSize: 14, fontFamily: 'ui-monospace, Consolas, monospace',
    theme: { background: '#20221e', foreground: '#f3eddf', cursor: '#e59637', selectionBackground: '#795025' },
    screenReaderMode: true, scrollback: 150, convertEol: true });
  const fit = new FitAddon(); terminal.loadAddon(fit); terminal.open(container); fit.fit();
  let input = '', history = [], historyIndex = 0;
  const prompt = () => terminal.write('\r\n\x1b[33mjana@tiefgang >\x1b[0m ');
  terminal.writeln(c.terminalIntro); prompt();
  const replace = text => { terminal.write('\x1b[2K\r\x1b[33mjana@tiefgang >\x1b[0m '+text); input=text; };
  terminal.attachCustomKeyEventHandler(event => {
    // Let the dialog handle Escape, Tab and the terminal shortcut.
    if (event.key==='Escape' || event.key==='Tab' || ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k')) return false;
    return true;
  });
  const listener = terminal.onData(data => {
    if (data==='\x1b[A' || data==='\x1b[B') {
      historyIndex=Math.max(0,Math.min(history.length,historyIndex+(data==='\x1b[A'?-1:1)));
      replace(history[historyIndex]||''); return;
    }
    // Never interpret terminal control sequences pasted by a visitor.
    if (data.startsWith('\x1b')) return;
    for (const char of data) {
      if (char==='\r' || char==='\n') {
        const command=input.trim(); input='';
        if(command) { history.push(command); history=history.slice(-30); historyIndex=history.length; }
        terminal.write('\r\n');
        if(command==='exit') { onClose(); prompt(); return; }
        if(command==='clear') terminal.clear();
        else terminal.write(interpret(command,getState(),c));
        prompt();
      } else if (char==='\x7f') { if(input.length) { input=input.slice(0,-1); terminal.write('\b \b'); } }
      else if (char==='\x03') { input=''; terminal.write('^C'); prompt(); }
      else if (char>=' ' && char<='~' && input.length<160) { input+=char; terminal.write(char); }
    }
  });
  const observer = new ResizeObserver(()=>{ if(container.clientWidth) fit.fit(); }); observer.observe(container);
  terminal.focus();
  return { focus() { fit.fit(); terminal.focus(); }, dispose() { observer.disconnect(); listener.dispose(); terminal.dispose(); } };
}
