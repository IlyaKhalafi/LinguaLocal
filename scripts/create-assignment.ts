import "./load-environment.mjs";
import { assignmentSchema, assignmentLink } from "../src/lib/assignments";
import { packSchema } from "../src/lib/schema";
import { readValidatedJson } from "../src/lib/json-file";
import { writeFileAtomically } from "../src/lib/atomic-file";
import { runCommand } from "../src/lib/cli";

runCommand(async () => {
  const [planFile, contentFile, address, output] = process.argv.slice(2);
  if (
    !planFile ||
    !contentFile ||
    !address ||
    !output ||
    process.argv.length !== 6
  )
    throw new Error(
      "Usage is create-assignment PLAN.json CONTENT.json SCHOOL-URL NEW-LINK.txt",
    );
  const plan = await readValidatedJson(planFile, assignmentSchema, 16384).catch(
    (error) => {
      throw new Error(`Unable to read assignment file ${planFile}`, {
        cause: error,
      });
    },
  );
  const content = await readValidatedJson(contentFile, packSchema).catch(
    (error) => {
      throw new Error(`Unable to read content file ${contentFile}`, {
        cause: error,
      });
    },
  );
  const link = assignmentLink(plan, content, address);
  await writeFileAtomically(output, `${plan.title}\n${link}\n`, {
    overwrite: false,
  }).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new Error(
        `Output already exists ${output}. Choose a new file name.`,
      );
    throw error;
  });
  console.log(
    `Created ${output}. Share the link with students on the school network.`,
  );
});
