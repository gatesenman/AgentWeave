export interface ColorScale {
  50: string;
  100: string;
  200?: string;
  300?: string;
  400?: string;
  500: string;
  600: string;
  700: string;
  800?: string;
  900?: string;
}

export interface SpacingScale {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
}

export interface Theme {
  name: string;
  mode: "light" | "dark";
  colors: {
    primary: ColorScale;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    card: string;
    cardForeground: string;
  };
  spacing: SpacingScale;
}
