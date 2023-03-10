import * as core from '@actions/core';
import { App, SharedChannelItem } from '@slack/bolt';
import { ChatPostMessageArguments, ChatUpdateArguments } from '@slack/web-api';
import Message from './message';
import constants from '../constants';

export interface SlackOptions {
  channel: string;
  signingSecret: string;
  token: string;
}

export default class Slack {
  private app: App | null;

  private channelID: string;

  private options: SlackOptions;

  public isRunning: boolean;

  constructor(options: SlackOptions) {
    this.app = null;
    this.channelID = '';
    this.isRunning = false;
    this.options = options;
  }

  private async findChannel(name: string): Promise<Object | null> {
    if (!this.app) {
      return null;
    }

    core.debug(`Finding #${name} channel...`);
    try {
      const result = await this.app.client.conversations.list({
        token: this.options.token,
      });

      if (!result.channels) {
        return result;
      }

      // eslint-disable-next-line no-restricted-syntax
      for (const channel of result.channels as SharedChannelItem[]) {
        if (channel.name === name) {
          this.channelID = channel.id;
          core.debug(`Found channel ID: ${this.channelID}`);
          core.info(`Found #${channel.name} channel`);
          return result;
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }

    throw new Error(constants.ERROR.CHANNEL_NOT_FOUND);
  }

  public async post(msg: Message): Promise<string> {
    if (!this.app || !this.isRunning) {
      return Promise.reject(constants.ERROR.NOT_RUNNING);
    }

    core.debug('Posting Slack message...');
    const fields = msg.getFields();

    let options: ChatPostMessageArguments = {
      channel: this.channelID,
      text: msg.getText(),
      token: this.options.token,
    };

    if (fields.length > 0) {
      options = {
        ...options,
        attachments: [
          {
            color: msg.status.color,
            blocks: [{ type: 'section', fields }],
          },
        ],
      };
    }

    const result = await this.app.client.chat.postMessage(options);
    if (typeof result.ts === 'string' && result.ts.length > 0) {
      core.info('Posted Slack message');
      core.debug(`Timestamp: ${result.ts}`);
      return result.ts;
    }

    return '';
  }

  public async update(msg: Message): Promise<string> {
    if (!this.app || !this.isRunning) {
      return Promise.reject(constants.ERROR.NOT_RUNNING);
    }

    if (msg.timestamp.length === 0) {
      return Promise.reject(constants.ERROR.UNDEFINED_MESSAGE_TIMESTAMP);
    }

    core.debug(`Updating Slack message (timestamp: ${msg.timestamp})...`);
    const fields = msg.getFields();

    let options: ChatUpdateArguments = {
      channel: this.channelID,
      text: msg.getText(),
      token: this.options.token,
      ts: msg.timestamp,
    };

    if (fields.length > 0) {
      options = {
        ...options,
        attachments: [
          {
            color: msg.status.color,
            blocks: [{ type: 'section', fields }],
          },
        ],
      };
    } else {
      options = {
        ...options,
        attachments: [],
      };
    }

    const result = await this.app.client.chat.update(options);
    if (typeof result.ts === 'string' && result.ts.length > 0) {
      core.info('Updated Slack message');
      return result.ts;
    }

    return '';
  }

  public async start(): Promise<void | Error> {
    if (this.isRunning) {
      throw new Error(constants.ERROR.ALREADY_RUNNING);
    }

    if (
      this.options.signingSecret.length === 0 ||
      this.options.token.length === 0
    ) {
      throw new Error(constants.ERROR.TOKEN_NOT_FOUND);
    }

    core.startGroup('Start Slack app');
    core.debug('Starting Slack app...');
    try {
      this.app = new App({
        signingSecret: this.options.signingSecret,
        token: this.options.token,
      });

      await this.app.start(3000);
      core.info('Started Slack app');

      await this.findChannel(this.options.channel);
      this.isRunning = true;
      core.endGroup();

      return Promise.resolve();
    } catch (error) {
      this.isRunning = false;
      core.endGroup();
      return Promise.reject(error);
    }
  }

  public async stop(): Promise<void | Error> {
    if (!this.app || !this.isRunning) {
      throw new Error(constants.ERROR.NOT_RUNNING);
    }

    core.startGroup('Stop Slack app');
    core.debug('Stopping Slack app...');
    try {
      await this.app.stop();
      core.info('Stopped Slack app');

      this.isRunning = false;
      core.endGroup();

      return Promise.resolve();
    } catch (error) {
      core.endGroup();
      return Promise.reject(error);
    }
  }
}
