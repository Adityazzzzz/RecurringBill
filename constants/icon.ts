// @ts-expect-error PNG asset modules are provided by the bundler.
import activity from "@/assets/icons/activity.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import add from "@/assets/icons/add.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import adobe from "@/assets/icons/adobe.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import back from "@/assets/icons/back.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import canva from "@/assets/icons/canva.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import claude from "@/assets/icons/claude.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import dropbox from "@/assets/icons/dropbox.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import figma from "@/assets/icons/figma.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import github from "@/assets/icons/github.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import home from "@/assets/icons/home.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import medium from "@/assets/icons/medium.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import menu from "@/assets/icons/menu.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import notion from "@/assets/icons/notion.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import openai from "@/assets/icons/openai.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import plus from "@/assets/icons/plus.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import setting from "@/assets/icons/setting.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import spotify from "@/assets/icons/spotify.png";
// @ts-expect-error PNG asset modules are provided by the bundler.
import wallet from "@/assets/icons/wallet.png";

export const icons = {
    home,
    wallet,
    setting,
    activity,
    add,
    back,
    menu,
    plus,
    notion,
    dropbox,
    openai,
    adobe,
    medium,
    figma,
    spotify,
    github,
    claude,
    canva,
} as const;

export type IconKey = keyof typeof icons;