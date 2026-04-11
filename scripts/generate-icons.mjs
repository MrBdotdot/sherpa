import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const svg = readFileSync("public/sherpa-icon.svg");

await sharp(svg).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(svg).resize(512, 512).png().toFile("public/icons/icon-512.png");

console.log("✓ public/icons/icon-192.png");
console.log("✓ public/icons/icon-512.png");
