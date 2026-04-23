import { Abi } from "viem";
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";
import StreamingTutorEscrowArtifact from "../../foundry/out/StreamingTutorEscrow.sol/StreamingTutorEscrow.json";

const streamingTutorEscrowAddress = process.env.NEXT_PUBLIC_STREAMING_TUTOR_ESCROW_ADDRESS;

/**
 * @example
 * const externalContracts = {
 *   1: {
 *     DAI: {
 *       address: "0x...",
 *       abi: [...],
 *     },
 *   },
 * } as const;
 */
const externalContracts: GenericContractsDeclaration = {};

if (streamingTutorEscrowAddress) {
  externalContracts[10143] = {
    StreamingTutorEscrow: {
      address: streamingTutorEscrowAddress as `0x${string}`,
      abi: StreamingTutorEscrowArtifact.abi as Abi,
    },
  };
}

export default externalContracts satisfies GenericContractsDeclaration;
