 ABIerc20 = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}]

		vaultABI = [{"inputs":[{"internalType":"contract IERC20","name":"_stakeToken","type":"address"},{"internalType":"contract IERC20","name":"_dummyToken","type":"address"},{"internalType":"contract IMasterChef","name":"_masterchef","type":"address"},{"internalType":"uint256","name":"_poolId","type":"uint256"},{"internalType":"contract IERC20","name":"_token","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"ref","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"CollectedFee","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"debt","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"depositFee","type":"uint256"},{"indexed":false,"internalType":"address","name":"referral","type":"address"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"harvester","type":"address"},{"indexed":true,"internalType":"address","name":"benficiary","type":"address"},{"indexed":false,"internalType":"uint256","name":"stakeID","type":"uint256"},{"indexed":false,"internalType":"address","name":"harvestInto","type":"address"},{"indexed":false,"internalType":"uint256","name":"harvestAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"penalty","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"callFee","type":"uint256"}],"name":"Harvest","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"harvestInto","type":"address"},{"indexed":false,"internalType":"uint256","name":"harvestAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"penalty","type":"uint256"}],"name":"SelfHarvest","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"poolAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"threshold","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"feeToPay","type":"uint256"}],"name":"UserSettingUpdate","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"stakeID","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"harvestAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"penalty","type":"uint256"}],"name":"Withdraw","type":"event"},{"inputs":[],"name":"accDtxPerShare","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"calculateTotalPendingDTXRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"_beneficiary","type":"address[]"},{"internalType":"uint256[][]","name":"_stakeID","type":"uint256[][]"}],"name":"collectCommission","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"_beneficiary","type":"address[]"}],"name":"collectCommissionAuto","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"defaultDirectPayout","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"referral","type":"address"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"depositFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"dummyToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_stakeID","type":"uint256"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"emergencyWithdrawAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"fundingRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getNrOfStakes","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"harvest","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"masterchef","outputs":[{"internalType":"contract IMasterChef","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"maxFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"maxFundingFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_stakeID","type":"uint256"}],"name":"multiCall","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"poolID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"poolPayout","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"minServe","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"publicBalanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"refShare1","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"refShare2","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"_stakeID","type":"uint256[]"},{"internalType":"address","name":"_harvestInto","type":"address"}],"name":"selfHarvest","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"setAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_depositFee","type":"uint256"}],"name":"setDepositFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_fundingRate","type":"uint256"}],"name":"setFundingRate","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IMasterChef","name":"_masterchef","type":"address"},{"internalType":"uint256","name":"_newPoolID","type":"uint256"}],"name":"setMasterChefAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_poolAddress","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"uint256","name":"_minServe","type":"uint256"}],"name":"setPoolPayout","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_refShare1","type":"uint256"}],"name":"setRefShare1","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_refShare2","type":"uint256"}],"name":"setRefShare2","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_newTreasury","type":"address"}],"name":"setTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"stakeToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"startEarning","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_withdrawAmount","type":"uint256"}],"name":"stopEarning","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"token","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"treasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_defaultDirectHarvest","type":"uint256"}],"name":"updateSettings","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"userInfo","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"debt","type":"uint256"},{"internalType":"uint256","name":"feesPaid","type":"uint256"},{"internalType":"address","name":"referredBy","type":"address"},{"internalType":"uint256","name":"lastAction","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_stakeID","type":"uint256"}],"name":"viewStakeEarnings","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"viewUserTotalEarnings","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"virtualAccDtxPerShare","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_stakeID","type":"uint256"},{"internalType":"address","name":"_harvestInto","type":"address"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"withdrawDummy","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_tokenAddress","type":"address"}],"name":"withdrawStuckTokens","outputs":[],"stateMutability":"nonpayable","type":"function"}]

		PLSvaultABI = [{"inputs":[{"internalType":"contract IERC20","name":"_dummyToken","type":"address"},{"internalType":"contract IMasterChef","name":"_masterchef","type":"address"},{"internalType":"address","name":"_admin","type":"address"},{"internalType":"contract IERC20","name":"_token","type":"address"},{"internalType":"address","name":"_buybackContract","type":"address"},{"internalType":"uint256","name":"_poolID","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"ref","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"CollectedFee","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"debt","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"depositFee","type":"uint256"},{"indexed":false,"internalType":"address","name":"referral","type":"address"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"harvester","type":"address"},{"indexed":true,"internalType":"address","name":"benficiary","type":"address"},{"indexed":false,"internalType":"uint256","name":"stakeID","type":"uint256"},{"indexed":false,"internalType":"address","name":"harvestInto","type":"address"},{"indexed":false,"internalType":"uint256","name":"harvestAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"penalty","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"callFee","type":"uint256"}],"name":"Harvest","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"harvestInto","type":"address"},{"indexed":false,"internalType":"uint256","name":"harvestAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"penalty","type":"uint256"}],"name":"SelfHarvest","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"poolAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"threshold","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"feeToPay","type":"uint256"}],"name":"UserSettingUpdate","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"stakeID","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"harvestAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"penalty","type":"uint256"}],"name":"Withdraw","type":"event"},{"stateMutability":"payable","type":"fallback"},{"inputs":[],"name":"accDtxPerShare","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"calculateTotalPendingDTXRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"_beneficiary","type":"address[]"},{"internalType":"uint256[][]","name":"_stakeID","type":"uint256[][]"}],"name":"collectCommission","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"_beneficiary","type":"address[]"}],"name":"collectCommissionAuto","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"defaultDirectPayout","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"referral","type":"address"}],"name":"deposit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"depositFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"dummyToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_stakeID","type":"uint256"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"emergencyWithdrawAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"fundingRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getNrOfStakes","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"harvest","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"masterchef","outputs":[{"internalType":"contract IMasterChef","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"maxFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"maxFundingFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_stakeID","type":"uint256"}],"name":"multiCall","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"poolID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"poolPayout","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"minServe","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"publicBalanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"refShare1","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"refShare2","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"_stakeID","type":"uint256[]"},{"internalType":"address","name":"_harvestInto","type":"address"}],"name":"selfHarvest","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"setAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_depositFee","type":"uint256"}],"name":"setDepositFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_fundingRate","type":"uint256"}],"name":"setFundingRate","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IMasterChef","name":"_masterchef","type":"address"},{"internalType":"uint256","name":"_newPoolID","type":"uint256"}],"name":"setMasterChefAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_poolAddress","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"uint256","name":"_minServe","type":"uint256"}],"name":"setPoolPayout","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_refShare1","type":"uint256"}],"name":"setRefShare1","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_refShare2","type":"uint256"}],"name":"setRefShare2","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_newTreasury","type":"address"}],"name":"setTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"startEarning","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_withdrawAmount","type":"uint256"}],"name":"stopEarning","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"token","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"treasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_defaultDirectHarvest","type":"uint256"}],"name":"updateSettings","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"userInfo","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"debt","type":"uint256"},{"internalType":"uint256","name":"feesPaid","type":"uint256"},{"internalType":"address","name":"referredBy","type":"address"},{"internalType":"uint256","name":"lastAction","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_stakeID","type":"uint256"}],"name":"viewStakeEarnings","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"viewUserTotalEarnings","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"virtualAccDtxPerShare","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_stakeID","type":"uint256"},{"internalType":"address","name":"_harvestInto","type":"address"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"withdrawDummy","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_tokenAddress","type":"address"}],"name":"withdrawStuckTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}]

		hexStakeAbi = [{"inputs":[{"internalType":"contract IERC20","name":"_token","type":"address"},{"internalType":"contract IMasterChef","name":"_masterchef","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"AddressEmptyCode","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"AddressInsufficientBalance","type":"error"},{"inputs":[],"name":"FailedInnerCall","type":"error"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"SafeERC20FailedOperation","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"debt","type":"uint256"},{"indexed":false,"internalType":"address","name":"referredBy","type":"address"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"harvestInto","type":"address"},{"indexed":false,"internalType":"uint256","name":"harvestAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"penalty","type":"uint256"}],"name":"Harvest","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"poolAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"threshold","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"feeToPay","type":"uint256"}],"name":"UserSettingUpdate","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"harvestAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"penalty","type":"uint256"}],"name":"Withdraw","type":"event"},{"inputs":[],"name":"accDtxPerShare","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"calculateTotalPendingDTXRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"defaultDirectPayout","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"harvest","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"hexC","outputs":[{"internalType":"contract ILookup","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"_user","type":"address[]"}],"name":"massRecalculate","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"masterchef","outputs":[{"internalType":"contract IMasterChef","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"maxStakes","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"multiCall","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"poolID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"poolPayout","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"minServe","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"publicBalanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"recalculate","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"referralPoints","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"referredBy","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"safePeriod","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_harvestInto","type":"address"}],"name":"selfHarvest","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IMasterChef","name":"_masterchef","type":"address"},{"internalType":"uint256","name":"_newPoolID","type":"uint256"}],"name":"setMasterChefAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"setMaxStakes","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_poolAddress","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"uint256","name":"_minServe","type":"uint256"}],"name":"setPoolPayout","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"setSafePeriod","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_referral","type":"address"}],"name":"stakeHexShares","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"token","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalTshares","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"treasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_defaultDirectHarvest","type":"uint256"}],"name":"updateSettings","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"updateTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userInfo","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"debt","type":"uint256"},{"internalType":"uint256","name":"lastAction","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_contract","type":"address"}],"name":"viewPoolMinServe","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_contract","type":"address"}],"name":"viewPoolPayout","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"viewStakeEarnings","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"virtualAccDtxPerShare","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_harvestInto","type":"address"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_tokenAddress","type":"address"}],"name":"withdrawStuckTokens","outputs":[],"stateMutability":"nonpayable","type":"function"}]


var projectName = "Piggy Bank"
var refdBy = "";

if (!localStorage.getItem("r") && window.location.search.includes('r=')) { // checks if referral localStorage is not set and link is a referral
    if (localStorage.getItem("is") !== window.location.search.split('r=')[1]) { // checks that user is not referring himself
        localStorage.setItem("r", window.location.search.split('r=')[1]);
        refdBy = window.location.search.split('r=')[1];
    }
} else if (localStorage.getItem("r")) { // localStorage is set, use that one
    refdBy = localStorage.getItem("r");
}

console.log("referral : " + refdBy)

var depositFee 
var fundingFee
     fetch(apiURL + 'api/miningFees.txt', {
        cache: "no-cache"
    }).then(function(response) {
        return response.text();
    }).then(function(html) {
        let x = JSON.parse(html)

        depositFee = x[0]
        fundingFee = x[1]
  
  console.log(depositFee)
  console.log(fundingFee)
    })
	
	
	fetch(apiURL + 'api/vaultBalances.txt', {
        cache: "no-cache"
    }).then(function(response) {
        return response.text();
    }).then(function(html) {
        let x = JSON.parse(html)
		
		fetch(apiURL + 'api/poolAllocations.txt', {
        cache: "no-cache"
    }).then(function(response) {
        return response.text();
    }).then(function(html) {
        let y = JSON.parse(html)
		
		if(isNaN(y[12])) { y[12] = 0; }
		
		/*
			OLD
			
		let total = Number(y[0])+Number(y[1])+Number(y[2])+Number(y[3])+Number(y[4])+Number(y[5])+Number(y[6])+Number(y[7])+Number(y[8])+Number(y[9])+Number(y[10])+Number(y[11])+Number(y[12])
		
	
		console.log("total allocation : "+total+ " and tshare " + Number(y[10]));
		document.getElementById("tshareVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[4])/10**8)).toLocaleString() + " T-shares</br> <small>Reward Allocation: "+((Number(y[10]))/total*100).toFixed(1)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>"
			document.getElementById("plsxVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[1])/10**18)).toLocaleString() + " PLSX</br> <small>Reward Allocation: "+((Number(y[7]))/total*100).toFixed(1)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>"
   	document.getElementById("plsVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[0])/10**18)).toLocaleString() + " PLS</br> <small>Reward Allocation: "+((Number(y[6]))/total*100).toFixed(1)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>"
   	document.getElementById("incVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[2])/10**18)).toLocaleString() + " INC</br> <small>Reward Allocation: "+((Number(y[8]))/total*100).toFixed(1)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>"
   	document.getElementById("hexVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[3])/10**8)).toLocaleString() + " HEX</br> <small>Reward Allocation: "+((Number(y[9]))/total*100).toFixed(1)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>"
    	document.getElementById("hoaVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[5])/10**18)).toLocaleString() + " HOA</br> <small>Reward Allocation: "+((Number(y[12]))/total*100).toFixed(1)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>"
    */
			
			
			let total = Number(y[6]) + Number(y[7]) + Number(y[8]) + Number(y[9]) + Number(y[10]) + Number(y[11]) + Number(y[12]) + Number(y[13]) + Number(y[14]) + Number(y[15]) + Number(y[17]) + Number(y[18]) + Number(y[19]) + Number(y[20]) + Number(y[21]) + Number(y[22]) + Number(y[23])
		console.log("total is " + total)
// Helper function to format reward allocation
function formatRewardAllocation(value, total) {
    const percentage = (Number(value) / total * 100);
    return percentage < 1 ? "< 1" : Math.round(percentage).toString();
}

document.getElementById("tshareVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[4])/10**12)).toLocaleString() + " T-shares</br> <small>Reward Allocation: "+formatRewardAllocation(y[10], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
document.getElementById("plsxVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[1])/10**18)).toLocaleString() + " PLSX</br> <small>Reward Allocation: "+formatRewardAllocation(y[7], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
document.getElementById("plsVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[0])/10**18)).toLocaleString() + " PLS</br> <small>Reward Allocation: "+formatRewardAllocation(y[6], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
document.getElementById("incVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[2])/10**18)).toLocaleString() + " INC</br> <small>Reward Allocation: "+formatRewardAllocation(y[8], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
document.getElementById("hexVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[3])/10**8)).toLocaleString() + " HEX</br> <small>Reward Allocation: "+formatRewardAllocation(y[9], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
document.getElementById("hoaVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[5])/10**18)).toLocaleString() + " HOA</br> <small>Reward Allocation: "+formatRewardAllocation(y[12], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
document.getElementById("atropaVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[6])/10**18)).toLocaleString() + " ATROPA</br> <small>Reward Allocation: "+formatRewardAllocation(y[13], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
document.getElementById("pdaiVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[7])/10**18)).toLocaleString() + " pDAI</br> <small>Reward Allocation: "+formatRewardAllocation(y[14], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
document.getElementById("pusdtVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[9])/10**6)).toLocaleString() + " pUSDT</br> <small>Reward Allocation: "+formatRewardAllocation(y[17], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
document.getElementById("pusdcVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[10])/10**6)).toLocaleString() + " pUSDC</br> <small>Reward Allocation: "+formatRewardAllocation(y[18], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
document.getElementById("solidxVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[8])/10**18)).toLocaleString() + " SOLIDX</br> <small>Reward Allocation: "+formatRewardAllocation(y[15], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
document.getElementById("pdripVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[11])/10**18)).toLocaleString() + " PDRIP</br> <small>Reward Allocation: "+formatRewardAllocation(y[19], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
//document.getElementById("emitVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[12])/10**18)).toLocaleString() + " EMIT</br> <small>Reward Allocation: "+formatRewardAllocation(y[20], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
document.getElementById("communisVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[13])/10**12)).toLocaleString() + " COM</br> <small>Reward Allocation: "+formatRewardAllocation(y[21], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
document.getElementById("ptgcVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[14])/10**18)).toLocaleString() + " pTGC</br> <small>Reward Allocation: "+formatRewardAllocation(y[22], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
document.getElementById("ufoVaultBalance").innerHTML = "Total Miners:</br>"+(Math.round(Number(x[15])/10**18)).toLocaleString() + " UFO</br> <small>Reward Allocation: "+formatRewardAllocation(y[23], total)+"% (<a href='#' onclick='voteAllocations()'>Vote</a>)</small></br></br>";
	})
   })


var plsVault = "0xE145932f6b010B0166aA6860D56b2730744B7d6f";
var PLSXVault = "0x16233F6d7398f134EbCec11101e792c03ED296a4";
var INCVault = "0x852443CB5b5f5B10e514CA74104bBF2Cd6CeF868";
var hexVault = "0x164D4C1fDd74A5b7256Fd9Eca958c9ff70617c03";
var hexStakeVault = "0x6b465C480CD590852f90c8f1b41Ab22922a1BF85";
var hoaVault = "0x9E70665aDee807f262Ae59Dc1f8D4Dd878320C21";

var ATROPAVault = "0x7c61919AccF037975bbD3a91b0F5811c640018b1"
var PDAIVault = "0xc13b8974CD5caa67D7e539D2654C872b5AcA5105"
var SOLIDXVault = "0x2057dd1687eafCD809386a41012748AC509df542"

var PUSDTVault = "0xed1b56c799d28a988bd79bbf2f7e238c2ba15c21"
var PUSDCVault = "0xf46810ce204a9a85a673ea9bbcc1bf5481ee1328"

var PDRIPVault = "0xc49EF441FFb79108047E4dF812F375A7E48FD3De"

var EMITVault = "0x1aB20028a50477e11bC4066047D8942De1375eF7"

var COMMUNISVault = "0x4441c3bdb96139a45df653ec0432d076631a6d9f"
var PTGCVault = "0xa620473a3eb138c43e1f7065bda0ded0e039d8fd"
var UFOVault = "0xce34298e7456fd748e432e02cc4f107ac864c739"


var usdcContract = ""
var plsxContract = "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab"
var incContract = "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d"
var hexContract = "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39"
var hoaContract = "0x7901a3569679AEc3501dbeC59399F327854a70fe"

var atropaContract = "0xCc78A0acDF847A2C1714D2A925bB4477df5d48a6"
var pdaiContract = "0x6b175474e89094c44da98b954eedeac495271d0f"
var solidxContract = "0x8Da17Db850315A34532108f0f5458fc0401525f6"

var pusdtContract = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
var pusdcContract = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

var pdripContract = "0xeB2CEed77147893Ba8B250c796c2d4EF02a72B68"

var emitContract = "0x32fB5663619A657839A80133994E45c5e5cDf427"

var comContract = "0x5a9780bfe63f3ec57f01b087cd65bd656c9034a8"
var ptgcContract = "0x94534eeee131840b1c0f61847c572228bdfdde93"
var ufoContract = "0x456548a9b56efbbd89ca0309edd17a9e20b04018"

  async function stakeHEX() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using HEX tokens',
				  html: '<img src="https://s2.coinmarketcap.com/static/img/coins/200x200/5015.png" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, hexContract);
				console.log(balance[1]);
				let raw = BigInt(balance[0])
				balance = (Number(raw)/Number(10**8))
				
				if(raw == BigInt(0)) {
					Swal.fire({
				  title: 'Mine using HEX tokens',
				  html: '<img src="https://s2.coinmarketcap.com/static/img/coins/200x200/5015.png" style="max-width: 64px"></br></br> You have no HEX tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
				document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance+'</div> HEX</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> HEX</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
							
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = clientValue2 / 100 * delayBE;
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {
			 			Swal.fire({
				  title: '<strong>Allowance</strong>',
				  html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				let allowance = await checkAllowance("0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39", account, hexVault);
				if(allowance >= (raw * BigInt(range2.value) / BigInt(100))) {
					finalizeStake(hexContract, (raw * BigInt(range2.value) / BigInt(100)));
				} else {
					document.getElementById("allowanceCheck").innerHTML = 'To proceed you must give allowance in wallet: </br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\'0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39\', \''+hexVault+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')"> Allow '+client2.textContent+' HEX</button> <button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\'0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39\', \''+hexVault+'\', \''+ethers.constants.MaxUint256+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')""> Give Infinite Allowance</button>';
				}
				}})
	}
   }
   
   async function stakeINC() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using Incentive(INC)',
				  html: '<img src="img/incentive.png" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, incContract);
				let raw = BigInt(balance[0])
				balance = balance[1]/100
				balance = (Number(raw)/Number(10**18))
				
				if(balance == 0) {
					Swal.fire({
				  title: 'Mine using INC tokens',
				  html: '<img src="img/incentive.png" style="max-width: 64px"></br></br> You have no Incentive(INC) tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
				document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance+'</div> INC</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> INC</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
									
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = (clientValue2 / 100 * delayBE);
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {
			 			Swal.fire({
				  title: '<strong>Allowance</strong>',
				  html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				let allowance = await checkAllowance(incContract, account, INCVault);
				
				if(allowance >= (raw * BigInt(range2.value) / BigInt(100))) {
					finalizeStake(incContract, (raw * BigInt(range2.value) / BigInt(100)));
				} else {
					document.getElementById("allowanceCheck").innerHTML = 'To proceed you must give allowance in wallet: </br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+incContract+'\', \''+INCVault+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')"> Allow '+client2.textContent+' INC</button> <button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+incContract+'\', \''+INCVault+'\', \''+ethers.constants.MaxUint256+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')""> Give Infinite Allowance</button>';
				}
				}})
				
				}

   }
   
   
   async function stakePLS() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using Pulse(PLS)',
				  html: '<img src="https://ipfs.io/ipfs/QmYqkn8pJUaV9KcEPYEvRPwgbfeozLEvcQ9aEwKNRUL3cR" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance;
				
				
				await provider.getBalance(account).then((reselt) => {
 // convert a currency unit from wei to ether
 balance = ethers.utils.formatUnits(reselt, "finney")
  raw = BigInt(ethers.utils.formatUnits(reselt, "wei"))
})
balance = Math.round(balance/10)/100

if(balance == 0) {
					Swal.fire({
				  title: 'Mine using PLS tokens',
				  html: '<img src="https://ipfs.io/ipfs/QmYqkn8pJUaV9KcEPYEvRPwgbfeozLEvcQ9aEwKNRUL3cR" style="max-width: 64px"></br></br> You have no Pulsechain(PLS) tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
				
					document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance.toLocaleString()+'</div> PLS</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> PLS</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
									
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = (clientValue2 / 100 * delayBE).toFixed(2);
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {


					finalizeStakePLS('PLS', (raw * BigInt(range2.value) / BigInt(100)));
			
				}})
				}
   }
   
     async function stakePLSX() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using PulseX(PLSX)',
				  html: '<img src="img/plsx2.png" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, plsxContract);
				let raw = BigInt(balance[0])
				balance = balance[1]/100
				
				
				if(balance == 0) {
					Swal.fire({
				  title: 'Mine using PLSX tokens',
				  html: '<img src="img/plsx2.png" style="max-width: 64px"></br></br> You have no PulseX(PLSX) tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
					
				document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance.toLocaleString()+'</div> PLSX</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> PLSX</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
									
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = (clientValue2 / 100 * delayBE).toFixed(2);
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {
			 			Swal.fire({
				  title: '<strong>Allowance</strong>',
				  html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				let allowance = await checkAllowance(plsxContract, account, PLSXVault);
				
				if(allowance >= (raw * BigInt(range2.value) / BigInt(100))) {
					finalizeStake(plsxContract, (raw * BigInt(range2.value) / BigInt(100)));
				} else {
					document.getElementById("allowanceCheck").innerHTML = 'To proceed you must give allowance in wallet: </br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+plsxContract+'\', \''+PLSXVault+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')"> Allow '+client2.textContent+' PLSX</button> <button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+plsxContract+'\', \''+PLSXVault+'\', \''+ethers.constants.MaxUint256+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')""> Give Infinite Allowance</button>';
				}
				}})
				}
   }
   
   async function stakeHOA() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using Hex Orange Address(HOA)',
				  html: '<img src="img/hoa.png" style="max-width: 100px; background-color: #C0C0C0;"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, hoaContract);
				let raw = BigInt(balance[0])
				balance = balance[1]/100
				
				
				if(balance == 0) {
					Swal.fire({
				  title: 'Mine using HOA tokens',
				  html: '<img src="img/hoa.png" style="max-width: 100px; background-color: #C0C0C0;">" ></br></br> You have no Hex Orange Address(HOA) tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
					
				document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance.toLocaleString()+'</div> HOA</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> HOA</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
									
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = (clientValue2 / 100 * delayBE).toFixed(2);
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {
			 			Swal.fire({
				  title: '<strong>Allowance</strong>',
				  html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				let allowance = await checkAllowance(hoaContract, account, hoaVault);
				
				if(allowance >= (raw * BigInt(range2.value) / BigInt(100))) {
					finalizeStake(hoaContract, (raw * BigInt(range2.value) / BigInt(100)));
				} else {
					document.getElementById("allowanceCheck").innerHTML = 'To proceed you must give allowance in wallet: </br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+hoaContract+'\', \''+hoaVault+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')"> Allow '+client2.textContent+' HOA</button> <button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+hoaContract+'\', \''+hoaVault+'\', \''+ethers.constants.MaxUint256+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')""> Give Infinite Allowance</button>';
				}
				}})
				}
   }
   
   async function stakeATROPA() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using Atropa(ATROPA)',
				  html: '<img src="img/atropa.png" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, atropaContract);
				let raw = BigInt(balance[0])
				balance = balance[1]/100
				balance = (Number(raw)/Number(10**18))
				
				if(balance == 0) {
					Swal.fire({
				  title: 'Mine using ATROPA tokens',
				  html: '<img src="img/atropa.png" style="max-width: 64px"></br></br> You have no Atropa(ATROPA) tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
				document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance+'</div> INC</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> ATROPA</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
									
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = (clientValue2 / 100 * delayBE);
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {
			 			Swal.fire({
				  title: '<strong>Allowance</strong>',
				  html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				let allowance = await checkAllowance(atropaContract, account, ATROPAVault);
				
				if(allowance >= (raw * BigInt(range2.value) / BigInt(100))) {
					finalizeStake(atropaContract, (raw * BigInt(range2.value) / BigInt(100)));
				} else {
					document.getElementById("allowanceCheck").innerHTML = 'To proceed you must give allowance in wallet: </br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+atropaContract+'\', \''+ATROPAVault+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')"> Allow '+client2.textContent+' ATROPA</button> <button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+atropaContract+'\', \''+ATROPAVault+'\', \''+ethers.constants.MaxUint256+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')""> Give Infinite Allowance</button>';
				}
				}})
				
				}

   }
   
   
   async function stakePDAI() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using pDAI',
				  html: '<img src="img/pdai.png" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, pdaiContract);
				let raw = BigInt(balance[0])
				balance = balance[1]/100
				balance = (Number(raw)/Number(10**18))
				
				if(balance == 0) {
					Swal.fire({
				  title: 'Mine using pDAI tokens',
				  html: '<img src="img/pdai.png" style="max-width: 64px"></br></br> You have no PDAI tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
				document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance+'</div> pDAI</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> pDAI</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
									
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = (clientValue2 / 100 * delayBE);
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {
			 			Swal.fire({
				  title: '<strong>Allowance</strong>',
				  html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				let allowance = await checkAllowance(pdaiContract, account, PDAIVault);
				
				if(allowance >= (raw * BigInt(range2.value) / BigInt(100))) {
					finalizeStake(pdaiContract, (raw * BigInt(range2.value) / BigInt(100)));
				} else {
					document.getElementById("allowanceCheck").innerHTML = 'To proceed you must give allowance in wallet: </br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+pdaiContract+'\', \''+PDAIVault+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')"> Allow '+client2.textContent+' pDAI</button> <button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+pdaiContract+'\', \''+PDAIVault+'\', \''+ethers.constants.MaxUint256+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')""> Give Infinite Allowance</button>';
				}
				}})
				
				}

   }
   
   async function stakePUSDT() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using pUSDT',
				  html: '<img src="img/pusdt.png" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, pusdtContract);
				let raw = BigInt(balance[0])
				balance = balance[1]/100
				balance = (Number(raw)/Number(10**6))
				
				if(balance == 0) {
					Swal.fire({
				  title: 'Mine using pUSDT tokens',
				  html: '<img src="img/pusdt.png" style="max-width: 64px"></br></br> You have no pUSDT tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
				document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance+'</div> pUSDT</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> pUSDT</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
									
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = (clientValue2 / 100 * delayBE);
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {
			 			Swal.fire({
				  title: '<strong>Allowance</strong>',
				  html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				let allowance = await checkAllowance(pusdtContract, account, PUSDTVault);
				
				if(allowance >= (raw * BigInt(range2.value) / BigInt(100))) {
					finalizeStake(pusdtContract, (raw * BigInt(range2.value) / BigInt(100)));
				} else {
					document.getElementById("allowanceCheck").innerHTML = 'To proceed you must give allowance in wallet: </br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+pusdtContract+'\', \''+PUSDTVault+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')"> Allow '+client2.textContent+' pDAI</button> <button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+pusdtContract+'\', \''+PUSDTVault+'\', \''+ethers.constants.MaxUint256+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')""> Give Infinite Allowance</button>';
				}
				}})
				
				}

   }
   
   
   async function stakePUSDC() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using pUSDC',
				  html: '<img src="img/pusdc.png" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, pusdcContract);
				let raw = BigInt(balance[0])
				balance = balance[1]/100
				balance = (Number(raw)/Number(10**6))
				
				if(balance == 0) {
					Swal.fire({
				  title: 'Mine using pUSDC tokens',
				  html: '<img src="img/pusdc.png" style="max-width: 64px"></br></br> You have no pUSDC tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
				document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance+'</div> pUSDC</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> pUSDC</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
									
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = (clientValue2 / 100 * delayBE);
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {
			 			Swal.fire({
				  title: '<strong>Allowance</strong>',
				  html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				let allowance = await checkAllowance(pusdcContract, account, PUSDCVault);
				
				if(allowance >= (raw * BigInt(range2.value) / BigInt(100))) {
					finalizeStake(pusdcContract, (raw * BigInt(range2.value) / BigInt(100)));
				} else {
					document.getElementById("allowanceCheck").innerHTML = 'To proceed you must give allowance in wallet: </br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+pusdcContract+'\', \''+PUSDCVault+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')"> Allow '+client2.textContent+' pDAI</button> <button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+pusdcContract+'\', \''+PUSDCVault+'\', \''+ethers.constants.MaxUint256+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')""> Give Infinite Allowance</button>';
				}
				}})
				
				}

   }
   
   
   async function stakePDRIP() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using PDRIP',
				  html: '<img src="img/pdrip.png" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, pdripContract);
				let raw = BigInt(balance[0])
				balance = balance[1]/100
				balance = (Number(raw)/Number(10**18))
				
				if(balance == 0) {
					Swal.fire({
				  title: 'Mine using PDRIP tokens',
				  html: '<img src="img/pdrip.png" style="max-width: 64px"></br></br> You have no PDRIP tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
				document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance+'</div> PDRIP</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> PDRIP</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
									
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = (clientValue2 / 100 * delayBE);
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {
			 			Swal.fire({
				  title: '<strong>Allowance</strong>',
				  html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				let allowance = await checkAllowance(pdripContract, account, PDRIPVault);
				
				if(allowance >= (raw * BigInt(range2.value) / BigInt(100))) {
					finalizeStake(pdripContract, (raw * BigInt(range2.value) / BigInt(100)));
				} else {
					document.getElementById("allowanceCheck").innerHTML = 'To proceed you must give allowance in wallet: </br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+pdripContract+'\', \''+PDRIPVault+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')"> Allow '+client2.textContent+' PDRIP</button> <button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+pdripContract+'\', \''+PDRIPVault+'\', \''+ethers.constants.MaxUint256+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')""> Give Infinite Allowance</button>';
				}
				}})
				
				}

   }


async function stakeEMIT() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using EMIT',
				  html: '<img src="img/emit.png" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, emitContract);
				let raw = BigInt(balance[0])
				balance = balance[1]/100
				balance = (Number(raw)/Number(10**18))
				
				if(balance == 0) {
					Swal.fire({
				  title: 'Mine using EMIT tokens',
				  html: '<img src="img/emit.png" style="max-width: 64px"></br></br> You have no EMIT tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
				document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance+'</div> EMIT</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> EMIT</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
									
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = (clientValue2 / 100 * delayBE);
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {
			 			Swal.fire({
				  title: '<strong>Allowance</strong>',
				  html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				let allowance = await checkAllowance(emitContract, account, EMITVault);
				
				if(allowance >= (raw * BigInt(range2.value) / BigInt(100))) {
					finalizeStake(emitContract, (raw * BigInt(range2.value) / BigInt(100)));
				} else {
					document.getElementById("allowanceCheck").innerHTML = 'To proceed you must give allowance in wallet: </br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+emitContract+'\', \''+EMITVault+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')"> Allow '+client2.textContent+' EMIT</button> <button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+emitContract+'\', \''+EMITVault+'\', \''+ethers.constants.MaxUint256+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')""> Give Infinite Allowance</button>';
				}
				}})
				
				}

   }
   
   async function stakePUSDC() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using pUSDC',
				  html: '<img src="img/pusdc.png" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, pusdcContract);
				let raw = BigInt(balance[0])
				balance = balance[1]/100
				balance = (Number(raw)/Number(10**6))
				
				if(balance == 0) {
					Swal.fire({
				  title: 'Mine using pUSDC tokens',
				  html: '<img src="img/pusdc.png" style="max-width: 64px"></br></br> You have no pUSDC tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
				document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance+'</div> pUSDC</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> pUSDC</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
									
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = (clientValue2 / 100 * delayBE);
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {
			 			Swal.fire({
				  title: '<strong>Allowance</strong>',
				  html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				let allowance = await checkAllowance(pusdcContract, account, PUSDCVault);
				
				if(allowance >= (raw * BigInt(range2.value) / BigInt(100))) {
					finalizeStake(pusdcContract, (raw * BigInt(range2.value) / BigInt(100)));
				} else {
					document.getElementById("allowanceCheck").innerHTML = 'To proceed you must give allowance in wallet: </br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+pusdcContract+'\', \''+PUSDCVault+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')"> Allow '+client2.textContent+' pDAI</button> <button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+pusdcContract+'\', \''+PUSDCVault+'\', \''+ethers.constants.MaxUint256+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')""> Give Infinite Allowance</button>';
				}
				}})
				
				}

   }
   

   
   
   async function stakeSOLIDX() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using SOLIDX',
				  html: '<img src="img/solidx.png" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, solidxContract);
				let raw = BigInt(balance[0])
				balance = balance[1]/100
				balance = (Number(raw)/Number(10**18))
				
				if(balance == 0) {
					Swal.fire({
				  title: 'Mine using SOLIDX tokens',
				  html: '<img src="img/solidx.png" style="max-width: 64px"></br></br> You have no SOLIDX tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
				document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance+'</div> SOLIDX</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> SOLIDX</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
									
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = (clientValue2 / 100 * delayBE);
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {
			 			Swal.fire({
				  title: '<strong>Allowance</strong>',
				  html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				let allowance = await checkAllowance(solidxContract, account, SOLIDXVault);
				
				if(allowance >= (raw * BigInt(range2.value) / BigInt(100))) {
					finalizeStake(solidxContract, (raw * BigInt(range2.value) / BigInt(100)));
				} else {
					document.getElementById("allowanceCheck").innerHTML = 'To proceed you must give allowance in wallet: </br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+solidxContract+'\', \''+SOLIDXVault+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')"> Allow '+client2.textContent+' SOLIDX</button> <button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+solidxContract+'\', \''+SOLIDXVault+'\', \''+ethers.constants.MaxUint256+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')""> Give Infinite Allowance</button>';
				}
				}})
				
				}

   }
   
   
      async function stakeCOM() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using Communis',
				  html: '<img src="img/com.png" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, comContract);
				let raw = BigInt(balance[0])
				balance = balance[1]/100
				balance = (Number(raw)/Number(10**12))
				
				if(balance == 0) {
					Swal.fire({
				  title: 'Mine using Communis tokens',
				  html: '<img src="img/com.png" style="max-width: 64px"></br></br> You have no Communis tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
				document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance+'</div> Communis</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> Communis</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
									
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = (clientValue2 / 100 * delayBE);
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {
			 			Swal.fire({
				  title: '<strong>Allowance</strong>',
				  html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				let allowance = await checkAllowance(comContract, account, COMMUNISVault);
				
				if(allowance >= (raw * BigInt(range2.value) / BigInt(100))) {
					finalizeStake(comContract, (raw * BigInt(range2.value) / BigInt(100)));
				} else {
					document.getElementById("allowanceCheck").innerHTML = 'To proceed you must give allowance in wallet: </br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+comContract+'\', \''+COMMUNISVault+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')"> Allow '+client2.textContent+' Communis</button> <button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+comContract+'\', \''+COMMUNISVault+'\', \''+ethers.constants.MaxUint256+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')""> Give Infinite Allowance</button>';
				}
				}})
				
				}

   }
   
   
      async function stakePTGC() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using pTGC',
				  html: '<img src="img/ptgc.png" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, ptgcContract);
				let raw = BigInt(balance[0])
				balance = balance[1]/100
				balance = (Number(raw)/Number(10**18))
				
				if(balance == 0) {
					Swal.fire({
				  title: 'Mine using pTGC tokens',
				  html: '<img src="img/ptgc.png" style="max-width: 64px"></br></br> You have no Communis tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
// Assume token has 18 decimals (adjust if different)
const TOKEN_DECIMALS = 18;
const DECIMALS_FACTOR = BigInt(10) ** BigInt(TOKEN_DECIMALS);

// Update the HTML to include a number input with step for decimals
document.getElementById("replace").innerHTML = `
  Your Balance: <strong><div id="userBalance" style="display: inline;">${balance}</div> pTGC</strong><br><br><br>
  To Stake: <strong><input type="number" id="client2" value="${balance}" step="0.01" style="width: 100px;"> pTGC</strong>
  <center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100" step="0.01"></center><br><br>
  Deposit Fee: ${(depositFee/100)}%<br>
  Mining Fee: ${(fundingFee/10000)}% <small>(hourly)</small><br><br>
  <strong>Your Principal Can be withdrawn at any time.</strong><br><br>
  Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal.
`;

const delayBE = balance;
const range2 = document.getElementById('formControlRange2');
const client2 = document.getElementById('client2');

// Initialize textbox with balance
client2.value = balance.toFixed(2);

// Update textbox when slider changes
range2.addEventListener('input', (e) => {
  const sliderValue = parseFloat(e.target.value);
  const stakeAmount = (sliderValue / 100 * delayBE).toFixed(2); // Round to 2 decimal places for display
  client2.value = stakeAmount;
});

// Update slider when textbox changes
client2.addEventListener('input', (e) => {
  let inputValue = parseFloat(e.target.value) || 0;
  // Ensure input doesn't exceed balance or go below 0
  if (inputValue > delayBE) inputValue = delayBE;
  if (inputValue < 0) inputValue = 0;
  client2.value = inputValue.toFixed(2); // Update textbox with sanitized value
  // Update slider (convert stake amount back to percentage)
  range2.value = (inputValue / delayBE * 100).toFixed(2);
});

// Handle staking logic
swalio.then(async (result) => {
  if (result.isConfirmed) {
    Swal.fire({
      title: '<strong>Allowance</strong>',
      html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
      showCancelButton: false,
      showConfirmButton: false
    });

    // Convert client2.value (stake amount) to BigInt with proper decimals
    const stakeAmount = parseFloat(client2.value); // e.g., 2.4 pDAI
    const stakeAmountWei = BigInt(Math.floor(stakeAmount * Number(DECIMALS_FACTOR))); // Convert to wei (or token's base unit)

    let allowance = await checkAllowance(ptgcContract, account, PTGCVault);

    if (allowance >= stakeAmountWei) {
      finalizeStake(ptgcContract, stakeAmountWei);
    } else {
      document.getElementById("allowanceCheck").innerHTML = `
        To proceed you must give allowance in wallet: <br>
        <button class="swal2-confirm swal2-styled" style="display: inline-block;" 
                onclick="giveAllowance('${ptgcContract}', '${PTGCVault}', '${stakeAmountWei}', '${stakeAmountWei}')"> 
          Allow ${client2.value} pTGC
        </button> 
        <button class="swal2-confirm swal2-styled" style="display: inline-block;" 
                onclick="giveAllowance('${ptgcContract}', '${PTGCVault}', '${ethers.constants.MaxUint256}', '${stakeAmountWei}')"> 
          Give Infinite Allowance
        </button>`;
    }
  }
});
				}
				}
   
      async function stakeUFO() {
	   
	   await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using UFO',
				  html: '<img src="img/ufo.png" style="max-width: 64px"></br></br><div id="replace"><div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await checkBalance2(account, ufoContract);
				let raw = BigInt(balance[0])
				balance = balance[1]/100
				balance = (Number(raw)/Number(10**18))
				
				if(balance == 0) {
					Swal.fire({
				  title: 'Mine using UFO tokens',
				  html: '<img src="img/ufo.png" style="max-width: 64px"></br></br> You have no UFO tokens in your wallet. Swap on PulseX or choose another token!',
				 showCancelButton: true,
			showConfirmButton: false
				})

				} else {
				document.getElementById("replace").innerHTML = 'Your Balance:<strong> <div id="userBalance" style="display: inline;">'+balance+'</div> UFO</strong></br></br></br>To Stake:  <strong><span id="client2">'+balance+'</span> UFO</strong></label><center><input type="range" class="form-control-range" id="formControlRange2" style="max-width:300px;" value="100"></center></br></br>Deposit Fee: '+(depositFee/100)+'%</br>Mining Fee: '+(fundingFee/10000)+'% <small>(hourly)</small></br></br><strong>Your Principal Can be withdrawn at any time.</strong></br></br>Through governance process fees can be turned on and adjusted. Deposit fee is charged only once - upon mining start. Mining Fee is charged perpetually every hour and the fees are deducted from your principal. ';
									
			  var delayBE = balance;
		  
			const range2 = document.getElementById('formControlRange2');
			const client2 = document.getElementById('client2');

			range2.addEventListener('change', (d) => {
			  const clientValue2 = d.target.value;
			  client2.textContent = (clientValue2 / 100 * delayBE);
			});
			
			
			swalio.then(async(result) => {
		  if (result.isConfirmed) {
			 			Swal.fire({
				  title: '<strong>Allowance</strong>',
				  html: '<div id="allowanceCheck"> Checking Allowance....<div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				let allowance = await checkAllowance(ufoContract, account, UFOVault);
				
				if(allowance >= (raw * BigInt(range2.value) / BigInt(100))) {
					finalizeStake(ufoContract, (raw * BigInt(range2.value) / BigInt(100)));
				} else {
					document.getElementById("allowanceCheck").innerHTML = 'To proceed you must give allowance in wallet: </br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+ufoContract+'\', \''+UFOVault+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')"> Allow '+client2.textContent+' UFO</button> <button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="giveAllowance(\''+ufoContract+'\', \''+UFOVault+'\', \''+ethers.constants.MaxUint256+'\', \''+(raw * BigInt(range2.value) / BigInt(100))+'\')""> Give Infinite Allowance</button>';
				}
				}})
				
				}

   }
   
   async function stakeHEXstake() {
	    await auth();
	   let accounts = await provider.send("eth_requestAccounts", []);
			let account = accounts[0];
			
	   				let swalio = Swal.fire({
				  title: 'Mine using Hex Stakes(Double Interest!)',
				  html: '<img src="https://s2.coinmarketcap.com/static/img/coins/200x200/5015.png" style="max-width: 64px"></br></br><div id="replace"><strong></br></br>Await while checking stakes</strong>....<div class="pixel-loader"></div></div>',
				 showCancelButton: true,
			confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'I understand, Start Mining!'
				})
				
				let balance = await hexStakeCount(account);
				console.log(balance)

				if(balance == 0) {
					let displayHTML = "<strong> You have NO official, active HEX stakes(shares). </br></br> You can open a Hex stake on go.hex.com </br></br> Staking your Hex Stakes(shares) is 100% safe as we do not get ANY access to your stakes!</strong>"
				Swal.fire({
				  title: 'No Active Hex Stakes(Shares)!',
				  html: displayHTML,
				  icon: 'error',
			showCancelButton: true,
				  showConfirmButton: false
				})
				} else {
					let _totalShares = BigInt(0);
					let _shares;
					let getHtml;
					for(let i=0; i<balance; i++) {
						_shares = await hexGetShares(account, i); 
						_totalShares+= _shares; 
						console.log(_shares);
					}
					
					document.getElementById("replace").innerHTML = '<strong>Total HEX T-Shares: '+(Number(_totalShares)/1e12)+' </br></br><small>NO allowance, NO permissions required. This is 100% safe, as the contract does not get access to your official Hex stakes!</small></strong></br></br></label>'
				
							swalio.then(async(result) => {
		  if (result.isConfirmed) {
	

			 			Swal.fire({
				  title: '<strong>Confirm in wallet</strong>',
				  html: '<div id="allowanceCheck"> Awaiting confirmation in wallet....</br></br> The contract does NOT get any permission. You remain in FULL control of your shares.</br><div class="pixel-loader"></div></div>',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				let accounts = await provider.send("eth_requestAccounts", []);
				let account = accounts[0];
				
				
				if(refdBy.length != "") {
					let ourAddress = decodeBase58(refdBy)
					if(ourAddress.length == 42) {
						account = ourAddress
					}
					console.log("refd by: " + account)
				} else {
					console.log("no ref")
				}
			
				try {
				
					const transaction = new ethers.Contract(hexStakeVault, hexStakeAbi, provider.getSigner());
					//console.log(stakeAmount);
					let doIt = await transaction.stakeHexShares(account);
					await doIt.wait();
					
					
							Swal.close();

				sleep(610).then(() => {  
					triggerConfetti();
				})  
				
				
				sleep(2100).then(() => {  
					Swal.fire({
						  title: '<strong>Congratulations! The process of mining '+tokenTicker+' has begun!!',
						  html: '<h2 class="swal2-title" id="swal2-title" style="display: block;"><strong>Good Job.</strong></h2></br></br>The process of mining '+tokenTicker+' has begun!. You can view your miners by clicking on the button below</br></br> <a href="view-pulse-ecosystem-miners.html"><button class="swal2-confirm swal2-styled" style="display: inline-block;"> View Miners</button></a> ',
						  icon: 'success',
						  showCancelButton: true,
						  cancelButtonText: "Close",
							showConfirmButton: false
						})
				})
				
			  } catch(e) {
							errorMessage(e)
						  }
				}})
				
				}				
   }

   
   function displayCustom(value) {
	   if(value == 0) {
	   document.getElementById("displayingCustom").style = "display: none"
	   } else {
		   document.getElementById("displayingCustom").style = "display: block"
	   }
   }

				async function checkAllowance(contractAddress2, userAddress, spender) {
				const contractAbi2 = [
				  "function allowance(address owner, address spender) external view returns (uint256)"
				];
				const xvmcContract2 = new ethers.Contract(contractAddress2, contractAbi2, provider);
				const balance2 = BigInt(await xvmcContract2.allowance(userAddress, spender));
				return balance2;
		}
		
		async function hexStakeCount(userAddress) {
				const contractAbi2 = [
				  "function stakeCount(address stakerAddr) external view returns (uint256)"
				];
				const xvmcContract3 = new ethers.Contract('0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39', contractAbi2, provider);
				const balance2 = Number(await xvmcContract3.stakeCount(userAddress));
				return balance2;
		}
		
		async function hexGetShares(userAddress, stakeID) {
			const contractAbi2 = [
				  "function stakeLists(address, uint256) external view returns (uint40,uint72,uint72,uint16,uint16,uint16,bool)"
				];
				const xvmcContract3 = new ethers.Contract('0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39', contractAbi2, provider);
				let balance2 = await xvmcContract3.stakeLists(userAddress, stakeID);
				// old: balance2 = Number(BigInt(balance2[2])/BigInt(10**7))
				return BigInt(balance2[2]);
		}
   
  
		
		async function checkBalance2(userAddress, contractAddress) {
				const contractAbi = [
				  "function balanceOf(address account) external view returns (uint256)"
				];

				const DTXContract = new ethers.Contract(contractAddress, contractAbi, provider);
				const resultLookup = await DTXContract.balanceOf(userAddress);
				const balance = Number(BigInt(resultLookup) / BigInt(10**16));
				return [resultLookup, balance];
		}
		
		async function giveAllowance(tokenAddress, spender, amount, stakeAmount) {
			let current = document.getElementById("allowanceCheck").innerHTML
			document.getElementById("allowanceCheck").innerHTML = current +  '</br></br> Awaiting allowance....<div class="pixel-loader"></div>'
					try {
					const transaction = new ethers.Contract(tokenAddress, ABIerc20, provider.getSigner());
					const doIt = await transaction.approve(spender, amount);
					await doIt.wait();
					
											Swal.close();

				sleep(610).then(() => {  
					triggerConfetti();
				})  
				
				
				sleep(2100).then(() => {  
					finalizeStake(tokenAddress, stakeAmount);
				})
				} catch(e) {
							errorMessage(e)
						  }
		}
		
		async function finalizeStake(tokenAddress, stakeAmount) {
			if(tokenAddress == hexContract) {
				vault = hexVault;
			} else if(tokenAddress == plsxContract) {
				vault = PLSXVault;
			} else if(tokenAddress == incContract) {
				vault = INCVault;
			}  else if(tokenAddress == hoaContract) {
				vault = hoaVault;
			}   else if(tokenAddress == pdaiContract) {
				vault = PDAIVault;
			}   else if(tokenAddress == atropaContract) {
				vault = ATROPAVault;
			}   else if(tokenAddress == solidxContract) {
				vault = SOLIDXVault;
			}    else if(tokenAddress == pusdtContract) {
				vault = PUSDTVault;
			}   else if(tokenAddress == pusdcContract) {
				vault = PUSDCVault;
			}   else if(tokenAddress == pdripContract) {
				vault = PDRIPVault;
			}   else if(tokenAddress == emitContract) {
				vault = EMITVault;
			}   else if(tokenAddress == comContract) {
				vault = COMMUNISVault;
			}   else if(tokenAddress == ptgcContract) {
				vault = PTGCVault;
			}   else if(tokenAddress == ufoContract) {
				vault = UFOVault;
			}
	
						 			Swal.fire({
				  title: '<strong>Confirm transaction in wallet</strong>',
				  html: '</br> Confim transaction in wallet to start mining<div class="pixel-loader"></div>',
				  icon: 'success',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				 let accounts = await provider.send("eth_requestAccounts", []);
				let account = accounts[0];
				
				
				if(refdBy.length != "") {
					let ourAddress = decodeBase58(refdBy)
					if(ourAddress.length == 42) {
						account = ourAddress
					}
					console.log("refd by: " + account)
				} else {
					console.log("no ref")
				}
			
				try {
					const transaction = new ethers.Contract(vault, vaultABI, provider.getSigner());
					const doIt = await transaction.deposit(stakeAmount, account);
					await doIt.wait();
					
							Swal.close();

				sleep(610).then(() => {  
					triggerConfetti();
				})  
				
			


				sleep(2100).then(() => {  
					Swal.fire({
						  title: '<strong>Congratulations! The process of mining '+tokenTicker+' has begun!!',
						  html: '<h2 class="swal2-title" id="swal2-title" style="display: block;"><strong>Good Job.</strong></h2></br></br>The process of mining '+tokenTicker+' has begun!. You can view your miners by clicking on the button below</br></br> <a href="view-pulse-ecosystem-miners.html"><button class="swal2-confirm swal2-styled" style="display: inline-block;"> View Miners</button></a> ',
						  icon: 'success',
						  showCancelButton: true,
						  cancelButtonText: "Close",
							showConfirmButton: false
						})
				})
				} catch(e) {
							errorMessage(e)
						  }
		}
		
		
		async function finalizeStakePLS(tokenAddress, stakeAmount) {
						 			Swal.fire({
				  title: '<strong>Confirm transaction in wallet</strong>',
				  html: '</br> Confim transaction in wallet to start mining<div class="pixel-loader"></div>',
				  icon: 'success',
				  showCancelButton: false,
				  showConfirmButton: false
				})
				
				 let accounts = await provider.send("eth_requestAccounts", []);
				let account = accounts[0];
		
				try {
						console.log("we here")
						console.log(plsVault)
					const transaction = new ethers.Contract(plsVault, PLSvaultABI, provider.getSigner());
					//console.log(stakeAmount);
					const doIt = await transaction.deposit(stakeAmount, account, {value: stakeAmount});
					await doIt.wait();
					
							Swal.close();

				sleep(610).then(() => {  
					triggerConfetti();
				})  
				
				if(isTestnet) {
							let actionToLog = 'stakePulseEco'
							if(localStorage.getItem(actionToLog) != undefined) {
							const now = new Date();
							const dayNumber = now.getDay() + (now.getYear() * 365)
								if(localStorage.getItem(actionToLog) != dayNumber) {
									localStorage.setItem(actionToLog, dayNumber)
									fetch('/callback/papi.html?wallet='+account+'&action='+actionToLog);
								} 
							} else {
								const now = new Date();
								const dayNumber = now.getDay() + (now.getYear() * 365);
									localStorage.setItem(actionToLog, dayNumber)
									fetch('/callback/papi.html?wallet='+account+'&action='+actionToLog);
							}
						}


				sleep(2100).then(() => {  
					Swal.fire({
						  title: '<strong>Congratulations! The process of mining '+tokenTicker+' has begun!!',
						  html: '<h2 class="swal2-title" id="swal2-title" style="display: block;"><strong>Good Job.</strong></h2></br></br>The process of mining '+tokenTicker+' has begun!. You can view your miners by clicking on the button below</br></br> <a href="view-pulse-ecosystem-miners.html"><button class="swal2-confirm swal2-styled" style="display: inline-block;"> View Miners</button></a> ',
						  icon: 'success',
						  showCancelButton: true,
						  cancelButtonText: "Close",
							showConfirmButton: false
						})
				})
				} catch(e) {
							errorMessage(e)
						  }
		}
		
		const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

		function decodeBase58(encodedAddress) {
  let decoded = BigInt(0n);
  const base = BigInt(base58Alphabet.length);

  for (let i = 0; i < encodedAddress.length; i++) {
    const char = encodedAddress[i];
    const index = base58Alphabet.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid character in base58 string');
    }
    decoded = decoded * base + BigInt(index);
  }

  const decodedHex = decoded.toString(16);
  const hexString = (decodedHex.length % 2 === 0) ? decodedHex : '0' + decodedHex;
  return '0x' + hexString;
}


function voteAllocations() {
	Swal.fire({
				  title: '<strong>Vote For Reward Allocation</strong>',
				  html: projectName+`(`+tokenTicker+`) rewards are shared between the native `+tokenTicker+` miners and the PulseChain ecosystem(PLS, PLSX, HEX, T-Shares, INC).</br></br> The reward allocations are decided through a 
								decentralized governance process!</br></br> Anybody can participate and propose new reward allocation. Other users can vote on proposals making decisions collectively.</br></br>
				  
					<a href="pools-farms.html"><button class="swal2-confirm swal2-styled" style="display: inline-block;"> Vote To Increase or Decrease Reward Allocation</button></a>
					
					`,
				 showCancelButton: true,
			showConfirmButton: false
				})
}
	 

