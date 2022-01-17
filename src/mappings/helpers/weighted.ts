import { Address } from '@graphprotocol/graph-ts';

import { Pool, WeightsLogger } from '../../types/schema';
import { WeightedPool } from '../../types/templates/WeightedPool/WeightedPool';

import { ZERO_BD } from './constants';
import { scaleDown, loadPoolToken } from './misc';

export function updatePoolWeights(poolId: string, block: string, logIndex: string): void {
  let pool = Pool.load(poolId);
  if (pool == null) return;

  let poolContract = WeightedPool.bind(changetype<Address>(pool.address));

  let tokensList = pool.tokensList;
  let weightsCall = poolContract.try_getNormalizedWeights();
  if (!weightsCall.reverted) {
    let weights = weightsCall.value;

    let weightsLogger = new WeightsLogger(poolId.concat('-').concat(block).concat('-').concat(logIndex));
    weightsLogger.weights = weights;
    weightsLogger.save();

    if (weights.length == tokensList.length) {
      let totalWeight = ZERO_BD;

      for (let i = 0; i < tokensList.length; i++) {
        let tokenAddress = changetype<Address>(tokensList[i]);
        let weight = weights[i];

        let poolToken = loadPoolToken(poolId, tokenAddress);
        if (poolToken != null) {
          poolToken.weight = scaleDown(weight, 18);
          poolToken.save();
        }

        totalWeight = totalWeight.plus(scaleDown(weight, 18));
      }

      pool.totalWeight = totalWeight;
    }
  }

  pool.save();
}
