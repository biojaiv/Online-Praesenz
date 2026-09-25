import { dhcpLogs, scripts } from './content.js';

/** Deterministic story and independent, pausable link-failure state machine. */
export function createJourney(onChange) {
  const state = { chapter: 0, progress: 0, dhcp: 0, lease: false, link: 'primary', vm: false, ready: false };
  let timer = 0, started = 0, remaining = 0, paused = false;
  let events = [];
  const emit = () => onChange(state);
  const clear = () => { clearTimeout(timer); timer = 0; };
  function schedule() {
    if (paused || state.link !== 'failing') return;
    started = performance.now();
    timer = setTimeout(() => {
      timer = 0; remaining = 0; state.link = 'backup';
      events.push({text:'uplink B forwarding · traffic restored', kind:'recovered'}); emit();
    }, remaining);
  }
  return {
    state,
    chapter(chapter, progress = chapter / 6) {
      const changed = state.chapter !== chapter;
      // Jumping directly to a later chapter assumes earlier provisioning completed.
      if (chapter > 2) { state.lease = true; state.dhcp = 3; }
      if (chapter < 2 && changed) { state.lease = false; state.dhcp = 0; }
      if (chapter === 0 && changed) { clear(); state.link = 'primary'; events = []; }
      state.chapter = chapter; state.progress = progress;
      state.ready = chapter === 6 && progress > .97 && state.link !== 'failing';
      emit();
    },
    dhcpNext() {
      if (state.link === 'failing') return;
      state.dhcp = Math.min(3, state.dhcp + 1); state.lease = state.dhcp === 3; emit();
    },
    dhcpReplay() { state.dhcp = 0; state.lease = false; emit(); },
    cable() {
      if (state.chapter === 0) return;
      clear();
      if (state.link === 'primary') {
        state.link = 'failing'; state.ready = false; remaining = 1800;
        events = [{text:'uplink A LOST · carrier down',kind:'error'}, {text:'convergence · selecting standby path B',kind:'error'}];
        schedule();
      } else {
        state.link = 'primary'; events = [{text:'uplink A restored · two paths available',kind:'recovered'}];
      }
      emit();
    },
    vm() { state.vm = !state.vm; emit(); },
    pause(value) {
      if (paused === value) return;
      paused = value;
      if (paused && timer) { remaining = Math.max(0, remaining - (performance.now() - started)); clear(); }
      else schedule();
    },
    logs() {
      const rows = scripts.slice(0,state.chapter+1).flatMap((lines,i) => i===2
        ? dhcpLogs.slice(0,state.chapter>2?4:state.dhcp+1).map((text,n)=>({text:`08:03:${13+n}  ${text}`,kind:''}))
        : lines.map(text=>({text,kind:''})));
      // Provisioning results wait while failover is still converging.
      const visible = !state.ready ? rows.filter(row=>!row.text.includes('JANA-01 ready')) : rows;
      return [...visible.slice(-5), ...events].slice(-7);
    },
    dispose() { clear(); },
  };
}

export function interpret(command, state, c) {
  const [name, target] = command.trim().toLowerCase().split(/\s+/);
  const connected = state.chapter > 0;
  const configured = state.chapter > 2 || (state.chapter === 2 && state.lease);
  if (!name) return '';
  if (name === 'help') return c.help.join('\r\n');
  if (name === 'whoami') return state.chapter >= 4 ? 'TIEFGANG\\jana' : state.chapter >= 3 ? c.noOS : 'JANA-01\\SYSTEM (UEFI / preboot)';
  if (name === 'ipconfig') return !connected ? c.offline : !configured ? c.noLease : 'Ethernet / VLAN 20\r\nIPv4:    10.20.0.42\r\nMask:    255.255.255.0\r\nGateway: 10.20.0.1\r\nDNS:     10.20.0.10\r\nDHCP:    10.20.0.10';
  if (name === 'gpresult') return state.chapter < 4 ? c.noDomain : 'Domain: tiefgang.example\r\nUser: jana\r\nApplied GPOs:\r\n  Workstation-Baseline\r\n  User-File-Access\r\n  Security-Policy';
  if (name === 'ping') {
    if (!target) return c.pingUsage;
    if (!connected) return c.offline;
    if (!configured) return c.noLease;
    if (state.link === 'failing') return c.pingLost;
    const ip = ({'dc01':'10.20.0.10','dc01.tiefgang.example':'10.20.0.10','files01':'10.20.0.20','10.20.0.1':'10.20.0.1','10.20.0.10':'10.20.0.10','10.20.0.20':'10.20.0.20'})[target];
    return ip ? `Reply from ${ip}: bytes=32 time<1ms TTL=128\r\n4 sent, 4 received, 0 lost · uplink ${state.link==='backup'?'B':'A'}` : c.unreachable;
  }
  return c.unknown;
}
