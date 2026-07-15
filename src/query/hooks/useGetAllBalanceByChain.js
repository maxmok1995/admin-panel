import {useQuery} from "@tanstack/react-query";
import axios from "axios";

export const useGetAllBalanceByChain = (chainId, params) => {
    return useQuery(
        ['chain-balance', chainId], async () => {
            const {data} = await axios.get(`/walletstat/v1/balance/${chainId}`, {
                params: params
            })
            return data;
        },
        {
            retry: 1
        });
}