import {createContext} from "react";
import { Lobby } from '../../shared/sharedTypes.ts';

export const LobbyContext = createContext<Lobby | null>(null);