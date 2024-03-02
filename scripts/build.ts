import { consola } from 'consola';
import { readJSONSync, writeJSONSync } from 'fs-extra';
import { merge } from 'lodash-es';
import { Dirent, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { Parser } from './Parser';
import { agents, config, localesDir, meta, publicDir, schemasDir } from './const';
import { checkDir, checkJSON, findDuplicates, getLocaleAgentFileName } from './utils';
import Agent from "./shared/agent";

class Builder {
  private agents: Dirent[];

  constructor(agents: Dirent[]) {
    checkDir(publicDir);
    this.agents = agents;
  }

  /**
   * build single locale agents
   * @param locale
   */
  private buildSingleLocaleAgents = (locale: string) => {
    const agentIndex: Agent[] = [];
    for (const file of this.agents) {
      // if file is not json ,skip it
      if (!checkJSON(file)) {
        console.warn('file is not json, skip:', file.name)
        continue;
      }
      const { content, locale: defaultLocale, id } = Parser.parseFile(file.name);

      const localeFileName = getLocaleAgentFileName(id, locale);

      // find correct agent content
      let agent: Agent;
      if (defaultLocale === locale) {
        agent = content;
      } else {
        // if locale agent is not exist, skip it
        const filePath = resolve(localesDir, localeFileName);
        if (!existsSync(filePath)) continue;

        // merge default agent with data
        const data = readJSONSync(filePath);
        agent = merge({}, content, data);
      }

      // write agent to public dir
      writeJSONSync(resolve(publicDir, localeFileName), agent);

      // add agent meta to index
      agentIndex.push({
        identifier: agent.identifier,
        name: agent.name,
        description: agent.description,
        tags: agent.tags,
        engine: agent.engine,
        models: agent.models,
        schemaVersion: agent.schemaVersion,
      } as Agent);
    }

    return agentIndex.sort(
      // @ts-ignore
      (a, b) => new Date(b.createAt) - new Date(a.createAt),
    );
  };

  run = async () => {
    await this.buildFullLocaleAgents();
  };

  buildFullLocaleAgents = async () => {
    for (const locale of config.outputLocales) {
      consola.start(`build ${locale}`);

      const agents = this.buildSingleLocaleAgents(locale);
      consola.info(`collected ${agents.length} agents`);

      let tags = [];

      agents.forEach((agent) => {
        tags = [...tags, ...agent.tags];
      });

      tags = findDuplicates(tags);

      const agentsIndex = { ...meta, tags, agents };

      const indexFileName = getLocaleAgentFileName('index', locale);
      writeJSONSync(resolve(publicDir, indexFileName), agentsIndex);
      consola.success(`build ${locale}`);
    }
  };
}

await new Builder(agents).run();
