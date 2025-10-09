const getParsedGradient = (k: any) => {
    const a = (l: any, j: any) => {
        let k;
        let m = '';
        for (k = 0; k < l.length; k++) {
            if (typeof l[k] === 'string') {
                m += l[k];
            } else {
                m += l[k].source;
            }
        }
        return new RegExp(m, j);
    };
    const c = () => {
        let s = "gi";
        let j = /(?:[+-]?\d*\.?\d+)(?:deg|grad|rad|turn)/;
        let l = /(?:to\s+)?((?:(?:left|right|top|bottom|ellipse at center|center, ellipse cover|)(?:\s+(?:top|bottom))?))/;
        let x = /\s*,\s*/;
        let t = /\#(?:[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/;
        let r = /\(\s*(?:[0-9]{1,3}\s*,\s*){1}\s*(?:[0-9]{1,3}(?:%)?\s*,\s*){1}[0-9]{1,3}(?:%)?\s*\)/;
        let q = /\(\s*(?:[0-9]{1,3}\s*,\s*){1}\s*(?:[0-9]{1,3}(?:%)?\s*,\s*){2}\s*(?:[0-9]{1,3}(?:%)?(?:[.][0-9]{1,3})?\s*)\)/;
        let u = /(?:[+-]?\d*\.?\d+)(?:%|[a-z]+)?/;
        let v = /[_A-Za-z-][_A-Za-z0-9-]*/;
        let k = a(["(?:", t, "|", "(?:rgb|hsl)", r, "|", "(?:rgba|hsla)", q, "|", v, ")"], "");
        let w = a([k, "(?:\\s+", u, ")?"], "");
        let o = a(["(?:", w, x, ")*", w], "");
        let n = a(["(?:(", j, ")|", l, ")"], "");
        let m = a(["(", n, ")", x, "(", o, ")"], s);
        let p = a(["\\s*(", k, ")", "(?:\\s+", "(", u, "))?", "(?:", x, "\\s*)?"], s);
        return {
            gradientSearch: m,
            colorsSearch: p
        };
    };
    const i = (k: any, m: any) => {
        let j: any;
        let o;
        let l: any;
        let n = k.gradientSearch.exec(m);
        if (n !== null) {
            j = {
                //string: n[0],
                colors: []
            };
            if (!!n[1]) {
                j.direction = n[1];
                if (j.direction.indexOf('ellipse') !== -1 || j.direction.indexOf('circle') !== -1) {
                    j.direction = 'radial';
                    j.type = 'radial-gradient';
                    //j.radialDirection = n[1]
                }
            }
            // if (!!n[2]) {
            //     j.angle = n[2];
            // }
            // if (!!n[3]) {
            //     j.sideCorner = n[3]
            // }
            o = k.colorsSearch.exec(n[4]);
            while (o !== null) {
                l = {
                    color: o[1]
                };
                if (!!o[2]) {
                    l.pos = o[2]
                }
                j.colors.push(l);
                o = k.colorsSearch.exec(n[4])
            }
        }
        return j;
    };
    let u;
    let n = [];
    let r = [];
    if (!k || k.length === 0 || k.indexOf("gradient(") === -1) {
        return [];
    }
    let v = /(?:\s*)(?:linear|radial)-gradient\s*\(((?:\([^\)]*\)|[^\)\(])*)\)/g;
    let q;
    while (q = v.exec(k)) {
        n.push(q[0]);
    }
    if (n.length === 0) {
        return [];
    }
    for (let o = 0; o < n.length; o++) {
        u = n[o];
        if (u.length === 0) {
            break;
        }
        if (u.indexOf('to ') === -1) {
            u = u.replace('linear-gradient(', 'linear-gradient(to bottom, ');
        }
        let l = c();
        let s = /.*gradient\s*\(((?:\([^\)]*\)|[^\)\(]*)*)\)/;
        let q = s.exec(u);
        if (q !== null) {
            let t = i(l, q[1]);
            if (t) {
                if (!t.direction && u.indexOf('radial') !== -1) {
                    t.type = 'radial-gradient';
                    t.direction = 'radial';
                } else {
                    t.type = 'linear-gradient';
                }
                for (let p = 0; p < t.colors.length; p++) {
                    if (typeof t.colors[p].pos !== 'undefined') {
                        t.colors[p].pos = t.colors[p].pos.replace('%', '');
                    } else {
                        if (t.colors.length === 1) {
                            t.colors[p].pos = '100';
                        } else {
                            t.colors[p].pos = '' + ((p / (t.colors.length - 1)) * 100);
                        }
                    }
                    if (typeof t.direction !== 'undefined') {
                        t.direction = t.direction.replace('deg', '');
                    }
                }
                r.push(t);
            }
        }
    }
    return r;
}
const validRgba = (rgba: any) => {
    if (isNaN(rgba)) {
        return false;
    }
    const value = parseInt(rgba, 10);
    if (value >= 0 && value <= 255) {
        return value;
    }
    return false;
}
const validApacity = (opacity: any) => {
    const value: number = parseFloat(opacity);
    if (!isNaN(opacity) && value >= 0 && value <= 1) {
        return value;
    }
    return false;
}
const validHex = (hex: string = '') => {
    return /^[0-9a-fA-F]{3,6}$/.test(hex);
}
const hexToRgba = (hexStr: string = '') => {
    let hex: string = hexStr.indexOf('#') > -1 ? hexStr.slice(1) : hexStr;
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return {
        r: parseInt(hex.slice(0, 2), 16) || 0,
        g: parseInt(hex.slice(2, 4), 16) || 0,
        b: parseInt(hex.slice(4, 6), 16) || 0,
        a: (parseInt(hex.slice(6, 8), 16) || 255) / 255
    };
}
const parseRgba = (rgbaStr: string = '') => {
    let rgba: any;
    if (rgbaStr.startsWith('rgb') || rgbaStr.startsWith('RGB')) {
        const cs: Array<string> = rgbaStr.split('(')[1].split(')')[0].split(',');
        rgba = {
            r: parseInt(cs[0], 10),
            g: parseInt(cs[1], 10),
            b: parseInt(cs[2], 10),
            a: cs.length > 3 ? parseFloat(cs[3]) : 1
        };
        return rgba;
    }
    //rgba = hexToRgba(rgbaStr);
    return rgba;
}
const rgbToHex = (rgba: any = {}) => {
    return (
        (rgba.r < 16 ? '0' : '') + rgba.r.toString(16) +
        (rgba.g < 16 ? '0' : '') + rgba.g.toString(16) +
        (rgba.b < 16 ? '0' : '') + rgba.b.toString(16)
    ).toUpperCase();
}

const bound = (n: any, max: any) => {
    if (typeof n === 'string' && n.indexOf('.') !== -1 && parseFloat(n) === 1) { 
        n = '100%'; 
    }
    const processPercent = typeof n === 'string' && n.indexOf('%') !== -1;
    n = Math.min(max, Math.max(0, parseFloat(n)));

    // Automatically convert percentage into number
    if (processPercent) {
        const s: any = n * max;
        n = parseInt(s, 10) / 100;
    }

    // Handle floating point rounding errors
    if ((Math.abs(n - max) < 0.000001)) {
        return 1;
    }

    // Convert into [0, 1] range if it isn't already
    return (n % max) / parseFloat(max);
}

const hsvToRgb = (ah: any, as: any = 100, av: any = 100) => {
    let h = bound(ah, 360) * 6;
    let s = bound(as, 100);
    let v = bound(av, 100);

    let i = Math.floor(h);
    let f = h - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    let mod = i % 6;

    let r = [v, q, p, p, t, v][mod];
    let g = [t, v, v, q, p, p][mod];
    let b = [p, p, t, v, v, q][mod];

    return { 
        r: Math.floor(r * 255), 
        g: Math.floor(g * 255), 
        b: Math.floor(b * 255)
    };

    // const h = ah / 60 % 6;
    // let s = as;
    // let v = av;
    // if (as > 1) {
    //     s = as / 100;
    // }
    // if (av > 1) {
    //     v = av / 100;
    // }
    // let i = Math.floor(h);
    // let f = h - i;
    // let p = v * (1 - s);
    // let q = v * (1 - f * s);
    // let t = v * (1 - (1 - f) * s);
    // let mod = i % 6;
    // let r = [v, q, p, p, t, v][mod];
    // let g = [t, v, v, q, p, p][mod];
    // let b = [p, p, t, v, v, q][mod];
    // return {
    //     r: Math.floor(r * 255),
    //     g: Math.floor(g * 255),
    //     b: Math.floor(b * 255)
    // };
}
const rgbaToHsv = (rgb: any = {}) => {
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;
    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let v = max;
    let d = max - min;
    let s = max === 0 ? 0 : d / max;
    let h: any;
    if (max === min) {
        h = 0;
    } else {
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return {
        h: Math.floor(h * 360),
        s: Math.floor(s * 100),
        v: Math.floor(v * 100)
    };
}
const getGradientRange = (startColor: string, endColor: string, color: any) => {
    let sRgba = getRgba(startColor);
    let eRgba = getRgba(endColor);
    let rgba = getRgba(color);
    let dr = rgba.r - sRgba.r;
    let dg = rgba.g - sRgba.g;
    let db = rgba.b - sRgba.b;
    let max = Math.max(dr, dg, db);
    let range;
    if (max === dg) {
        range = (eRgba.g - sRgba.g) ? (dg / (eRgba.g - sRgba.g)) : 0;
    } else if (max === db) {
        range = (eRgba.b - sRgba.b) ? (db / (eRgba.b - sRgba.b)) : 0;
    } else {
        range = (eRgba.r - sRgba.r) ? (dr / (eRgba.r - sRgba.r)) : 0;
    }
    return range;
}
const getGradientArray = (startColor: string, endColor: string, step: number) => {
    const rs = [];
    if (step < 2) {
        rs.push(startColor);
    } else {
        let sRgba = getRgba(startColor);
        let eRgba = getRgba(endColor);
        let dr = (eRgba.r - sRgba.r) / (step - 1);
        let dg = (eRgba.g - sRgba.g) / (step - 1);
        let db = (eRgba.b - sRgba.b) / (step - 1);
        //let da = (eRgba.a - sRgba.a) / (step - 1);
        for (let i = 0; i < step; i++) {
            rs.push(rgbaToString({
                r: parseInt(dr * i + sRgba.r),
                g: parseInt(dg * i + sRgba.g),
                b: parseInt(db * i + sRgba.b),
                //a: parseInt(da * i + sRgba.a),
            }));
        }
    }
    return rs;
}
const getGradientColor = (startColor: string, endColor: string, range: number) => {
    let sRgba = getRgba(startColor);
    let eRgba = getRgba(endColor);
    let dr = (eRgba.r - sRgba.r) * range;
    let dg = (eRgba.g - sRgba.g) * range;
    let db = (eRgba.b - sRgba.b) * range;
    let da = (eRgba.a - sRgba.a) * range;
    let rgba = {
        r: parseInt(dr + sRgba.r, 10),
        g: parseInt(dg + sRgba.g, 10),
        b: parseInt(db + sRgba.b, 10),
        a: parseInt(da + sRgba.a, 10)
    };
    return rgbaToString(rgba);
}
const rgbaToString = (rgba: any = {}) => {
    return (rgba.a === null) ?
        `rgb(${rgba.r},${rgba.g},${rgba.b})` : `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`;
}
const getRgba = (color: string) => {
    let rgba: any;
    if (color.startsWith('rgb') || color.startsWith('RGB')) {
        rgba = parseRgba(color);
    } else if (color.startsWith('#')) {
        const value: string = color.slice(1);
        if (validHex(value)) {
            rgba = hexToRgba(value);
        }
    } else if (validHex(color)) {
        rgba = hexToRgba(color);
    }
    return rgba;
}
const getHex = (color: string) => {
    let hex: any;
    if (color.startsWith('rgb') || color.startsWith('RGB')) {
        hex = rgbToHex(color);
    } else if (color.startsWith('#')) {
        hex = color;
    } else if (validHex(color)) {
        hex = '#' + hex;
    }
    return hex;
}
const getHueAndPosByHsv = (hsv: any, width: any, height: any) => {
    return {
        hue: hsv.h,
        pos: {
            x: hsv.s * width / 100,
            y: (100 - hsv.v) * height / 100
        }
    };
}

export {
    getParsedGradient,
    validRgba,
    validApacity,
    validHex,
    hexToRgba,
    parseRgba,
    rgbToHex,
    hsvToRgb,
    rgbaToHsv,
    getGradientRange,
    getGradientArray,
    getGradientColor,
    rgbaToString,
    getRgba,
    getHex,
    getHueAndPosByHsv
};