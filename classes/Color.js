class Color {
  static reset = "\x1b[0m";
  static bright = "\x1b[1m";
  static dim = "\x1b[2m";
  static underscore = "\x1b[4m";
  static blink = "\x1b[5m";
  static reverse = "\x1b[7m";
  static hidden = "\x1b[8m";

  static black = "\x1b[30m";
  static red = "\x1b[31m";
  static green = "\x1b[32m";
  static yellow = "\x1b[33m";
  static blue = "\x1b[34m";
  static magenta = "\x1b[35m";
  static cyan = "\x1b[36m";
  static white = "\x1b[37m";

  static bgBlack = "\x1b[40m";
  static bgRed = "\x1b[41m";
  static bgGreen = "\x1b[42m";
  static bgYellow = "\x1b[43m";
  static bgBlue = "\x1b[44m";
  static bgMagenta = "\x1b[45m";
  static bgCyan = "\x1b[46m";
  static bgWhite = "\x1b[47m";

  static colorize(text, color, isBright = false) {
    return (isBright ? this.bright : '') + color + text + this.reset;
  }
}

module.exports = Color;