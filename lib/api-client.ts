import { useQuery } from "@tanstack/react-query";
import type {
  QueryFunction,
  QueryKey,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";

export interface NowPlaying {
  title: string | null;
  listeners: number;
  streamStart: string | null;
}

export interface HealthStatus {
  status: string;
}

let _baseUrl: string | null = null;

export function setBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

function applyBaseUrl(input: string): string {
  if (!_baseUrl || !input.startsWith("/")) return input;
  return `${_baseUrl}${input}`;
}

export function resolveUrl(path: string): string {
  return applyBaseUrl(path);
}

export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  constructor(response: Response) {
    super(`HTTP ${response.status} ${response.statusText}`);
    this.status = response.status;
    this.statusText = response.statusText;
  }
}

export async function customFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const resolved = applyBaseUrl(url);
  const response = await fetch(resolved, options);
  if (!response.ok) throw new ApiError(response);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
type ErrorType<T = unknown> = ApiError & { data?: T };

export interface PodcastEpisode {
  guid: string;
  title: string;
  date: string;
  duration: string;
  audioUrl: string;
  imageUrl: string;
  description: string;
  episode: string;
}

export interface PodcastFeed {
  channelTitle: string;
  channelDesc: string;
  channelImage: string;
  episodes: PodcastEpisode[];
}

export interface GemistEpisode {
  guid: string;
  title: string;
  date: string;
  audioUrl: string;
  fileSize: string;
}

export interface GemistShow {
  showId: string;
  showName: string;
  episodes: GemistEpisode[];
}

export interface GemistFeed {
  shows: GemistShow[];
}

export const getGemist = async (options?: RequestInit): Promise<GemistFeed> =>
  customFetch<GemistFeed>("/api/gemist", { ...options, method: "GET" });

export const getGetGemistQueryKey = () => ["/api/gemist"] as const;

export function useGetGemist<
  TData = Awaited<ReturnType<typeof getGemist>>,
  TError = ErrorType<void>
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getGemist>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetGemistQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getGemist>>> = ({ signal }) =>
    getGemist({ signal, ...requestOptions });
  const query = useQuery({ queryKey, queryFn, ...queryOptions }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
}

export const getPodcasts = async (options?: RequestInit): Promise<PodcastFeed> =>
  customFetch<PodcastFeed>("/api/podcasts", { ...options, method: "GET" });

export const getGetPodcastsQueryKey = () => ["/api/podcasts"] as const;

export function useGetPodcasts<
  TData = Awaited<ReturnType<typeof getPodcasts>>,
  TError = ErrorType<void>
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getPodcasts>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetPodcastsQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getPodcasts>>> = ({ signal }) =>
    getPodcasts({ signal, ...requestOptions });
  const query = useQuery({ queryKey, queryFn, ...queryOptions }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
}

export const getNowPlaying = async (options?: RequestInit): Promise<NowPlaying> =>
  customFetch<NowPlaying>("/api/nowplaying", { ...options, method: "GET" });

export const getGetNowPlayingQueryKey = () => ["/api/nowplaying"] as const;

export const getGetNowPlayingQueryOptions = <
  TData = Awaited<ReturnType<typeof getNowPlaying>>,
  TError = ErrorType<void>
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getNowPlaying>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetNowPlayingQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getNowPlaying>>> = ({
    signal,
  }) => getNowPlaying({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof getNowPlaying>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export function useGetNowPlaying<
  TData = Awaited<ReturnType<typeof getNowPlaying>>,
  TError = ErrorType<void>
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getNowPlaying>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetNowPlayingQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };
  return { ...query, queryKey: queryOptions.queryKey };
}
