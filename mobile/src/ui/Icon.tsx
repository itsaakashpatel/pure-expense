import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "@/theme";

// 1.75-stroke rounded icon set, ported from docs/designs/v1/ui.jsx.
export type IconName =
  | "home"
  | "list"
  | "camera"
  | "scan"
  | "plus"
  | "check"
  | "checkCircle"
  | "chevR"
  | "chevL"
  | "chevD"
  | "close"
  | "flash"
  | "image"
  | "search"
  | "calendar"
  | "trash"
  | "edit"
  | "sliders"
  | "arrowUp"
  | "arrowDown"
  | "bell"
  | "card"
  | "note"
  | "settings"
  | "food"
  | "groceries"
  | "transport"
  | "shopping"
  | "travel"
  | "utilities";

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  sw?: number;
};

export function Icon({ name, size = 22, color = colors.ink, sw = 1.75 }: Props) {
  const p = {
    fill: "none",
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const dot = { fill: color, stroke: "none" as const };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render(name, p, dot, color)}
    </Svg>
  );
}

function render(
  name: IconName,
  p: object,
  dot: object,
  color: string,
): React.ReactNode {
  switch (name) {
    case "home":
      return (
        <>
          <Path d="M3 10.5 12 3l9 7.5" {...p} />
          <Path d="M5 9.5V20h14V9.5" {...p} />
        </>
      );
    case "list":
      return (
        <>
          <Path d="M8 7h12M8 12h12M8 17h12" {...p} />
          <Circle cx="4" cy="7" r="1.2" {...dot} />
          <Circle cx="4" cy="12" r="1.2" {...dot} />
          <Circle cx="4" cy="17" r="1.2" {...dot} />
        </>
      );
    case "camera":
      return (
        <>
          <Path
            d="M3 8.5A2 2 0 0 1 5 6.5h2l1.2-2h7.6L19 6.5h0a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"
            {...p}
          />
          <Circle cx="12" cy="13" r="3.6" {...p} />
        </>
      );
    case "scan":
      return (
        <>
          <Path
            d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"
            {...p}
          />
          <Path d="M7 12h10" {...p} />
        </>
      );
    case "plus":
      return <Path d="M12 5v14M5 12h14" {...p} />;
    case "check":
      return <Path d="M5 12.5 10 17.5 19 6.5" {...p} />;
    case "checkCircle":
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...p} />
          <Path d="M8 12.2 11 15.2 16.5 9" {...p} />
        </>
      );
    case "chevR":
      return <Path d="M9 6l6 6-6 6" {...p} />;
    case "chevL":
      return <Path d="M15 6l-6 6 6 6" {...p} />;
    case "chevD":
      return <Path d="M6 9l6 6 6-6" {...p} />;
    case "close":
      return <Path d="M6 6l12 12M18 6 6 18" {...p} />;
    case "flash":
      return <Path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" {...p} />;
    case "image":
      return (
        <>
          <Rect x="3.5" y="4.5" width="17" height="15" rx="3" {...p} />
          <Circle cx="8.5" cy="9.5" r="1.6" {...p} />
          <Path d="M4 17l4.5-4 3.5 3 3-2.5L20.5 18" {...p} />
        </>
      );
    case "search":
      return (
        <>
          <Circle cx="11" cy="11" r="6.5" {...p} />
          <Path d="m16 16 4 4" {...p} />
        </>
      );
    case "calendar":
      return (
        <>
          <Rect x="3.5" y="5" width="17" height="15.5" rx="3" {...p} />
          <Path d="M3.5 9.5h17M8 3v4M16 3v4" {...p} />
        </>
      );
    case "trash":
      return <Path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" {...p} />;
    case "edit":
      return (
        <>
          <Path d="M4 20h4L19 9l-4-4L4 16v4Z" {...p} />
          <Path d="M14 6l4 4" {...p} />
        </>
      );
    case "sliders":
      return (
        <>
          <Path d="M5 7h9M18 7h1M5 17h1M10 17h9" {...p} />
          <Circle cx="16" cy="7" r="2" {...p} />
          <Circle cx="8" cy="17" r="2" {...p} />
        </>
      );
    case "arrowUp":
      return <Path d="M12 19V5M6 11l6-6 6 6" {...p} />;
    case "arrowDown":
      return <Path d="M12 5v14M6 13l6 6 6-6" {...p} />;
    case "bell":
      return (
        <>
          <Path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" {...p} />
          <Path d="M10 19a2 2 0 0 0 4 0" {...p} />
        </>
      );
    case "card":
      return (
        <>
          <Rect x="3" y="5.5" width="18" height="13" rx="3" {...p} />
          <Path d="M3 10h18M7 14.5h4" {...p} />
        </>
      );
    case "note":
      return (
        <>
          <Path d="M5 4.5h14v15H5z" {...p} />
          <Path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" {...p} />
        </>
      );
    case "settings":
      return (
        <>
          <Circle cx="12" cy="12" r="3.2" {...p} />
          <Path
            d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3"
            {...p}
          />
        </>
      );
    // category glyphs
    case "food":
      return <Path d="M7 3v7M7 10c-1.5 0-2.5-1-2.5-3V3M7 10v11M17 3c-2 0-3 2-3 5s1 4 3 4v9" {...p} />;
    case "groceries":
      return (
        <>
          <Path d="M5 8h14l-1.3 9.5a2 2 0 0 1-2 1.7H8.3a2 2 0 0 1-2-1.7L5 8Z" {...p} />
          <Path d="M8.5 8 11 3.5M15.5 8 13 3.5M9 12v3M15 12v3M12 12v3" {...p} />
        </>
      );
    case "transport":
      return (
        <>
          <Path
            d="M5 16v2.5M19 16v2.5M4 16h16M5 16l1.5-6h11L19 16M4 16a2 2 0 0 1 1.2-1.8M20 16a2 2 0 0 0-1.2-1.8"
            {...p}
          />
          <Circle cx="8" cy="13" r="0.4" {...dot} />
        </>
      );
    case "shopping":
      return (
        <>
          <Path d="M6 8h12l1 11.5H5L6 8Z" {...p} />
          <Path d="M9 9V6a3 3 0 0 1 6 0v3" {...p} />
        </>
      );
    case "travel":
      return (
        <Path
          d="M21 13.5 3 18l2-4-1-7 3 1 3 4 6-2a1.5 1.5 0 0 1 2 2.5l-2 1.5Z"
          {...p}
        />
      );
    case "utilities":
      return <Path d="M13 3 5 13.5h5L9 21l9-11h-5l1-7Z" {...p} />;
    default:
      return null;
  }
}
