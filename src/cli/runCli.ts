import { parseCommandLineArgs } from "./parseCommandLineArgs";
import { getHelpText } from "./getHelpText";
import { getPackageVersion } from "./getPackageVersion";
import { CommandLineOptions } from "./CommandLineOptions";
import { Environment } from "./environment";
import { resolveConfigFile } from "./resolveConfigFile";
import { resolveConfiguration } from "../configuration";
import { formatFileText } from "../formatFileText";

export async function runCli(args: string[], environment: Environment) {
    const options = parseCommandLineArgs(args);
    await runCliWithOptions(options, environment);
}

export async function runCliWithOptions(options: CommandLineOptions, environment: Environment) {
    if (options.showHelp) {
        environment.log(getHelpText());
        return;
    }
    else if (options.showVersion) {
        environment.log(getPackageVersion());
        return;
    }

    const unresolvedConfiguration = await resolveConfigFile(options.config, environment);
    const configResult = resolveConfiguration(unresolvedConfiguration);
    const { config } = configResult;

    for (const diagnostic of configResult.diagnostics)
        environment.warn(diagnostic.message);

    const filePaths = await environment.glob(options.filePatterns);

    if (options.outputFilePaths) {
        for (const filePath of filePaths)
            environment.log(filePath);
        return;
    }
    else if (options.outputResolvedConfig) {
        // todo: print this out formatted
        environment.log(JSON.stringify(configResult.config));
        return;
    }

    const promises: Promise<void>[] = [];

    for (const filePath of filePaths) {
        const promise = environment.readFile(filePath).then(fileText => {
            const result = formatFileText(filePath, fileText, config);
            return environment.writeFile(filePath, result);
        });
        promises.push(promise);
    }

    return Promise.all(promises);
}