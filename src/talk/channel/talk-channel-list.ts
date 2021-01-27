/*
 * Created on Wed Jan 27 2021
 *
 * Copyright (c) storycraft. Licensed under the MIT Licence.
 */

import { Long } from "bson";
import { TypedEmitter } from "tiny-typed-emitter";
import { Channel } from "../../channel/channel";
import { ChannelList } from "../../channel/channel-list";
import { TalkSession } from "../client";
import { EventContext } from "../../event/event-context";
import { OpenChannel } from "../../openlink/open-channel";
import { DefaultRes } from "../../packet/bson-data-codec";
import { ChainedIterator } from "../../util/chained-iterator";
import { OpenChannelListEvents, TalkChannelListEvents } from "../event/events";
import { Managed } from "../managed";
import { TalkOpenChannelList } from "../openlink/talk-open-channel-list";
import { TalkChannel } from ".";
import { TalkNormalChannelList } from "./talk-normal-channel-list";

/**
 * Manage normal channels and open channels
 */
export class TalkChannelList extends TypedEmitter<TalkChannelListEvents> implements Managed<TalkChannelListEvents>, ChannelList<TalkChannel> {

    private _normalList: TalkNormalChannelList;
    private _openList: TalkOpenChannelList;

    /**
     * Construct managed channel list
     * @param session
     */
    constructor(session: TalkSession) {
        super();

        this._normalList = new TalkNormalChannelList(session);
        this._openList = new TalkOpenChannelList(session);
    }

    get size() {
        return this._normalList.size + this._openList.size;
    }

    /**
     * Normal channel list
     */
    get normalList() {
        return this._normalList;
    }

    /**
     * Open channel list
     */
    get openList() {
        return this._openList;
    }

    get(channelId: Long) {
        return this._normalList.get(channelId) || this._openList.get(channelId);
    }

    all() {
        const normalIter = this._normalList.all();
        const openIter = this._openList.all();

        return new ChainedIterator<TalkChannel>(normalIter, openIter);
    }

    pushReceived(method: string, data: DefaultRes, parentCtx: EventContext<OpenChannelListEvents>) {
        const ctx = new EventContext<OpenChannelListEvents>(this, parentCtx);

        this._normalList.pushReceived(method, data, ctx);
        this._openList.pushReceived(method, data, ctx);
    }

    /**
     * Initialize TalkChannelList using channelList.
     * @param session
     * @param channelList
     */
    static async initialize(talkChannelList: TalkChannelList, channelList: (Channel | OpenChannel)[] = []) {
        const normalList: Channel[] = [];
        const openList: OpenChannel[] = [];
        channelList.forEach(channel => {
            if ('linkId' in channel) {
                openList.push(channel);
            } else {
                normalList.push(channel);
            }
        });

        await TalkNormalChannelList.initialize(talkChannelList._normalList, normalList);
        await TalkOpenChannelList.initialize(talkChannelList._openList, openList);

        return talkChannelList;
    }

}