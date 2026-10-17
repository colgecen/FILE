#!/usr/bin/env python3
"""X11 helper for embedding foreign windows (used by electron/main/zenEmbed.ts).

Çalışma modları:
  xembed.py <cmd> [args...]   tek seferlik istek (test için)
  xembed.py --serve           kalıcı sunucu: stdin'den JSON satırları okur
"""
import json
import sys


def walk(w, depth: int, out: list, parent: int) -> None:
    try:
        tree = w.query_tree()
    except Exception:
        return
    for c in tree.children:
        try:
            cls = c.get_wm_class()
            name = c.get_wm_name()
            g = c.get_geometry()
            attrs = c.get_attributes()
            out.append({
                'id': c.id,
                'parent': parent,
                'class': list(cls) if cls else None,
                'name': name if isinstance(name, str) else None,
                'width': g.width,
                'height': g.height,
                'mapped': attrs.map_state == 2,
            })
        except Exception:
            pass
        if depth > 0:
            walk(c, depth - 1, out, c.id)


def dispatch(d, root, cmd: str, a: list) -> dict:
    from Xlib import X

    def win(i):
        return d.create_resource_object('window', int(i, 0))

    def extents(w):
        # Firefox/GTK CSD gölge payları: sol, sağ, üst, alt (pencere çizimi bu payı siyah basar)
        for atom_name in ('_GTK_FRAME_EXTENTS', '_NET_FRAME_EXTENTS'):
            try:
                p = w.get_full_property(d.intern_atom(atom_name), X.AnyPropertyType)
                if p is not None and len(p.value) >= 4:
                    l, r, t, b = (int(v) for v in p.value[:4])
                    return l, r, t, b
            except Exception:
                pass
        return 0, 0, 0, 0

    def clip(w, l, t, cw, ch):
        # XShape: pencereyi yalnızca içerik dikdörtgenine indir; CSD payları görünmez olur
        try:
            from Xlib.ext import shape
            w.shape_rectangles(shape.SO.Set, shape.SK.Bounding, 0, 0, 0, [(l, t, cw, ch)])
            w.shape_rectangles(shape.SO.Set, shape.SK.Input, 0, 0, 0, [(l, t, cw, ch)])
        except Exception:
            pass

    if cmd == 'list':
        out: list = []
        walk(root, 2, out, root.id)
        return {'ok': True, 'windows': out}
    if cmd == 'get':
        w = win(a[0])
        g = w.get_geometry()
        attrs = w.get_attributes()
        l, r, t, b = extents(w)
        return {
            'ok': True,
            'x': g.x,
            'y': g.y,
            'width': g.width,
            'height': g.height,
            'cx': g.x + l,
            'cy': g.y + t,
            'cw': g.width - l - r,
            'ch': g.height - t - b,
            'mapped': attrs.map_state == 2,
            'parent': w.query_tree().parent.id,
        }
    if cmd == 'embed':
        child = win(a[0])
        parent = win(a[1])
        x, y, w, h = (int(v) for v in a[2:6])
        try:
            child.set_wm_normal_hints(
                flags=X.USSize | X.PMinSize | X.PMaxSize,
                min_width=1, min_height=1,
                max_width=16384, max_height=16384,
            )
        except Exception:
            pass
        l, r, t, b = extents(child)
        child.reparent(parent, x - l, y - t)
        child.configure(x=x - l, y=y - t, width=w + l + r, height=h + t + b,
                        border_width=0, stack_mode=X.Above)
        clip(child, l, t, w, h)
        child.map()
        child.configure(stack_mode=X.Above)
        d.sync()
        return {'ok': True}
    if cmd == 'move':
        child = win(a[0])
        x, y, w, h = (int(v) for v in a[1:5])
        l, r, t, b = extents(child)
        child.configure(x=x - l, y=y - t, width=w + l + r, height=h + t + b,
                        stack_mode=X.Above)
        clip(child, l, t, w, h)
        child.map()
        child.configure(stack_mode=X.Above)
        d.sync()
        return {'ok': True}
    if cmd == 'map':
        w = win(a[0])
        w.map()
        w.configure(stack_mode=X.Above)
        d.sync()
        return {'ok': True}
    if cmd == 'unmap':
        win(a[0]).unmap()
        d.sync()
        return {'ok': True}
    if cmd == 'unparent':
        child = win(a[0])
        try:
            from Xlib.ext import shape
            big = [(0, 0, 65535, 65535)]
            child.shape_rectangles(shape.SO.Set, shape.SK.Bounding, 0, 0, 0, big)
            child.shape_rectangles(shape.SO.Set, shape.SK.Input, 0, 0, 0, big)
            child.delete_property(d.intern_atom('WM_NORMAL_HINTS'))
            child.reparent(root, 80, 80)
            child.configure(x=80, y=80, width=1100, height=700)
            d.sync()
        except Exception as exc:
            return {'ok': False, 'error': f'unparent: {exc}'}
        return {'ok': True}
    if cmd == 'grab':
        from Xlib import XK
        mode = a[0] if len(a) > 0 else 'off'
        kcs = [d.keysym_to_keycode(XK.XK_Left), d.keysym_to_keycode(XK.XK_Right)]
        mods = X.ControlMask | X.ShiftMask
        try:
            for kc in kcs:
                if mode == 'on':
                    root.grab_key(kc, mods, False, X.GrabModeAsync, X.GrabModeAsync)
                else:
                    root.ungrab_key(kc, mods)
            d.sync()
        except Exception as exc:
            return {'ok': False, 'error': f'grab: {exc}'}
        return {'ok': True}
    if cmd == 'ping':
        return {'ok': True}
    return {'ok': False, 'error': 'unknown command'}


def emit(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj) + '\n')
    sys.stdout.flush()


def serve_loop(d, root) -> None:
    import os
    import select
    from Xlib import X as _X, XK

    sock = d.display.socket
    xfd = sock.fileno() if hasattr(sock, 'fileno') else int(sock)
    stdin_fd = sys.stdin.fileno()
    left_kc = d.keysym_to_keycode(XK.XK_Left)
    right_kc = d.keysym_to_keycode(XK.XK_Right)
    buf = ''
    while True:
        try:
            ready, _, _ = select.select([stdin_fd, xfd], [], [])
        except (InterruptedError, OSError):
            continue
        if stdin_fd in ready:
            chunk = os.read(stdin_fd, 65536)
            if len(chunk) == 0:
                return
            buf += chunk.decode(errors='ignore')
            while '\n' in buf:
                raw, buf = buf.split('\n', 1)
                raw = raw.strip()
                if len(raw) == 0:
                    continue
                rid = None
                try:
                    req = json.loads(raw)
                    rid = req.get('id')
                    res = dispatch(d, root, str(req.get('cmd', '')), list(req.get('a', [])))
                except Exception as exc:
                    res = {'ok': False, 'error': str(exc)}
                res['id'] = rid
                emit(res)
        if xfd in ready:
            try:
                # select uyanışı ham baytları getirir; Xlib'i okumaya zorla
                d.sync()
                while d.pending_events() > 0:
                    ev = d.next_event()
                    if ev.type == _X.KeyPress and ev.detail in (left_kc, right_kc):
                        emit({'event': 'envkey', 'key': 'left' if ev.detail == left_kc else 'right'})
            except Exception:
                return


def main() -> None:
    from Xlib import display

    d = display.Display()
    root = d.screen().root
    argv = sys.argv[1:]
    if len(argv) > 0 and argv[0] != '--serve':
        print(json.dumps(dispatch(d, root, argv[0], argv[1:])))
        return
    serve_loop(d, root)


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(json.dumps({'ok': False, 'error': str(exc)}))
        sys.exit(1)
