"use server";

import GenerateIdiom1 from "./idiom-1/generate";
import GenerateIdiom2 from "./idiom-2/generate";
import GenerateIdiom3 from "./idiom-3/generate";
import GenerateIdiom4 from "./idiom-4/generate";

async function main() {
  await GenerateIdiom1();
  await GenerateIdiom2();
  await GenerateIdiom3();
  await GenerateIdiom4();
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
