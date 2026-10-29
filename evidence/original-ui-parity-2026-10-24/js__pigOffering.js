  		ABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"buyer","type":"address"},{"indexed":false,"internalType":"address","name":"pool","type":"address"},{"indexed":false,"internalType":"uint256","name":"oinks","type":"uint256"}],"name":"BUY","type":"event"},{"inputs":[],"name":"DTX","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"HEX","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"HEX_PLS_PAIR","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"INC","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"INC_PLS_PAIR","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"OINK_PLS_PAIR","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PLSX","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PLSX_PLS_PAIR","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_poolInto","type":"address"}],"name":"buyWithHEX","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_poolInto","type":"address"}],"name":"buyWithINC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_poolInto","type":"address"}],"name":"buyWithPLS","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_poolInto","type":"address"}],"name":"buyWithPLSX","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"canWithdraw","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"getHEXPerPLSPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getINCPerPLSPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getOinkPerPLSPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getPLSXPerPLSPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_poolInto","type":"address"}],"name":"getWithHEX","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_poolInto","type":"address"}],"name":"getWithINC","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_poolInto","type":"address"}],"name":"getWithPLS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_poolInto","type":"address"}],"name":"getWithPLSX","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"governor","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"haltProposalStartingId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minimumPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_poolInto","type":"address"},{"internalType":"uint256","name":"_price","type":"uint256"}],"name":"priceWithDiscount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"treasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"votingCreditContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"wPLS","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_a","type":"address"}],"name":"withdrawERC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_token","type":"address"}],"name":"withdrawToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"withdrawalStarted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"withdrawalStartedCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"withdrawalStartedTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]

		 ABIerc20 = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}]



async function showOffering() {

    let swalio = Swal.fire({
        title: '<strong>Buy '+projectName+' ('+tokenTicker+') Tokens</strong>',
        html: '<img src="img/pulse-dao.png" style="max-width: 150px"></br></br><div id="replace">'+'</strong> <strong>Buy With:</strong><select class="swal2-select" style="display: flex;" name="spendToken" id="spendToken">   <option value="PLS">PulseChain (PLS)</option><option value="PLSX">PulseX (PLSX)</option><option value="INC">Incentive (INC)</option><option value="HEX">HEX</option></select></br><strong>Choose Discount:</strong><select class="swal2-select" style="display: flex;" name="discount" id="discount">   <option value="0">5 Year Miner (<strong>~20%</strong> discount)</option><option value="1">3 Year Miner (<strong>~15%</strong> discount)</option><option value="2">1 Year Miner (<strong>~10%</strong> discount)</option></select><strong>Tokens to Spend</strong></br><input id="spendAmount" autocapitalize="off" class="swal2-input" placeholder="" type="text" style="display: flex; max-width: 150px;" value="10000000">   <div id="displayingCustom" style="display: none;"><small>Gift a stake to another wallet</br> Mandatory Serve is an optional period of days during which stake can not be withdrawn under any circumstances(no emergency end possible)</small> </div>'+'</div>',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Get OINK!'
    })



        swalio.then(async (result) => {
            if (result.isConfirmed) {
				
				let spendAmount = document.getElementById("spendAmount").value
				let spendToken = document.getElementById("spendToken").value
				let discountOption = document.getElementById("discount").value
				
				let receiveOption
				
				let poolAddress
				
				let estimateReceive
				
				if(discountOption == 0) {
					receiveOption = "</br><strong>Your Discount: 20%</strong></br></br><small>You will receive the OINK tokens in a form of a miner locked for 5 years.</small>"
					poolAddress = "0xf3E82f4123d4262a2baEC25b03652f3932A91739"
				} else if(discountOption == 1) {
					receiveOption = "</br><strong>Your Discount: 15%</strong></br></br><small>You will receive the OINK tokens in a form of a miner locked for 3 years.</small>"
					poolAddress = "0x15b51Ece819f3B51ce814de67bB2419660701a3c"
				} else if(discountOption == 2) {
					receiveOption = "</br><strong>Your Discount: 10%</strong></br></br><small>You will receive the OINK tokens in a form of a miner locked for 1 year.</small>"
					poolAddress = "0xc0483f1b0dcf601888fFD0d3A44b7124e80DB7D1"
				} /*else if(discountOption == 3) {
					receiveOption = "</br></br><small>You will receive OINK tokens directly into wallet</small>"
					poolAddress = "0x39b3E852D6fFA1aF6694Ef87C062450de6778da8"
				}
		*/	
				
	
				Swal.fire({
                        title: '<strong>OINK Token Purchase</strong>',
                        html: '</br> You are spending <strong>'+Number(spendAmount).toLocaleString()+' '+spendToken+'</strong></br> <div id="toReceif">... loading ...</div> </br> '+receiveOption+'</br></br><strong> Connect wallet and confirm transaction to finalize the purchase!</strong><div class="pixel-loader"></div>',
                        icon: 'success',
                        showCancelButton: true,
                        showConfirmButton: false
                    })
					
					if(spendToken == "PLS") {
					estimateReceive = await callGetWithPLS(BigInt(spendAmount)*BigInt(10**18), poolAddress)
				} else if(spendToken == "PLSX") {
					estimateReceive = await callGetWithPLSX(BigInt(spendAmount)*BigInt(10**18), poolAddress)
				} else if(spendToken == "INC") {
					estimateReceive = await callGetWithINC(BigInt(spendAmount)*BigInt(10**18), poolAddress)
				} else if(spendToken == "HEX") {
					estimateReceive = await callGetWithHEX(BigInt(spendAmount)*BigInt(10**8), poolAddress)
				}
				
				if(BigInt(estimateReceive) > BigInt(remainingOink)) {
					 Swal.fire({
                                title: '<strong>Not enough tokens left for sale!',
                                html: '<h2 class="swal2-title" id="swal2-title" style="display: block;">You are trying to purchase more OINK than there are available. Please reduce your purchase amount and try again! ',
                                icon: 'error',
                                showCancelButton: true,
                                showConfirmButton: false
                            })
							
				} else if (BigInt(estimateReceive) < BigInt(100)*BigInt(10**18)) {
						 Swal.fire({
                                title: '<strong>Below minimum purchase!',
                                html: '<h2 class="swal2-title" id="swal2-title" style="display: block;">You must purchase atleast 100 tokens. Please increase the amount and try again!',
                                icon: 'error',
                                showCancelButton: true,
                                showConfirmButton: false
                            })
				}					else {
				//calculate from prices or from contract?
	estimateReceive = Number(BigInt(estimateReceive) / BigInt(10**18))
	
	
					
					document.getElementById("toReceif").innerHTML = 'to receive ~<strong>'+estimateReceive.toLocaleString()+' OINK</strong>';
					
				    await auth();
    let accounts = await provider.send("eth_requestAccounts", []);
    let account = accounts[0];
	
	
		// IF POOL ADRESS NOT 5yr3yror1yr, GET THEIR OWN ACCOUNT ADDRESS

                let duration
                if (!(discountOption == 0 || discountOption == 1 || discountOption == 2)) {
					poolAddress = account
                }
          
                  try {
	
	if(spendToken == "PLS") {
					 const transaction = new ethers.Contract("0x4Ca5e92D67Fe647F1f8E6f21bd4D6Ff4aE35dA8e", ABI, provider.getSigner());
                        const doIt = await transaction.buyWithPLS(BigInt(spendAmount)*BigInt(10**18), poolAddress, {
							value: BigInt(spendAmount) * BigInt(10**18)
						});
                        await doIt.wait();
						
				} else if(spendToken == "PLSX") {
					
					//give allowance first
					let transaction = new ethers.Contract("0x95B303987A60C71504D99Aa1b13B4DA07b0790ab", ABIerc20, provider.getSigner());
					let doIt = await transaction.approve("0x4Ca5e92D67Fe647F1f8E6f21bd4D6Ff4aE35dA8e", BigInt(spendAmount)*BigInt(10**18));
					await doIt.wait();
					
					
					 transaction = new ethers.Contract("0x4Ca5e92D67Fe647F1f8E6f21bd4D6Ff4aE35dA8e", ABI, provider.getSigner());
                         doIt = await transaction.buyWithPLSX(BigInt(spendAmount)*BigInt(10**18), poolAddress);
                        await doIt.wait();
					
				} else if(spendToken == "INC") {
					
					let transaction = new ethers.Contract("0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d", ABIerc20, provider.getSigner());
					let doIt = await transaction.approve("0x4Ca5e92D67Fe647F1f8E6f21bd4D6Ff4aE35dA8e", BigInt(spendAmount)*BigInt(10**18));
					await doIt.wait();
					
					 transaction = new ethers.Contract("0x4Ca5e92D67Fe647F1f8E6f21bd4D6Ff4aE35dA8e", ABI, provider.getSigner());
                         doIt = await transaction.buyWithINC(BigInt(spendAmount)*BigInt(10**18), poolAddress);
                        await doIt.wait();
						
				} else if(spendToken == "HEX") {
					
					let transaction = new ethers.Contract("0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39", ABIerc20, provider.getSigner());
					let doIt = await transaction.approve("0x4Ca5e92D67Fe647F1f8E6f21bd4D6Ff4aE35dA8e", BigInt(spendAmount)*BigInt(10**8));
					await doIt.wait();
					
					 transaction = new ethers.Contract("0x4Ca5e92D67Fe647F1f8E6f21bd4D6Ff4aE35dA8e", ABI, provider.getSigner());
                         doIt = await transaction.buyWithHEX(BigInt(spendAmount)*BigInt(10**8), poolAddress);
                        await doIt.wait();
						
				}
	
                       
						
						localStorage.removeItem('userAddress')
						localStorage.removeItem('allStakes')
						
                        Swal.close();

                        sleep(610).then(() => {
                            triggerConfetti();
                        })

						
					

                        sleep(2100).then(() => {
                            Swal.fire({
                                title: '<strong>Congratulations! You\'ve succesfuly bought OINK!!',
                                html: '<h2 class="swal2-title" id="swal2-title" style="display: block;"><strong>Good Job.</strong></h2></br></br>Your tokens have been sent</br></br> <a href="view-all-miner.html"><button class="swal2-confirm swal2-styled" style="display: inline-block;"> View Your Miners</button></a> </br></br><button class="swal2-confirm swal2-styled" style="display: inline-block;" onclick="addToMetamask()"> Add OINK to Metamask</button></a> ',
                                icon: 'success',
                                showCancelButton: false,
                                showConfirmButton: false
                            })
                        })
                    } catch (e) {
                        errorMessage(e)
                    }


}

            }
        })

    
}







async function callGetWithPLS(amount, poolAddress) {
		const RPC_URL = 'https://rpc-pulsechain.g4mm4.io'; // Network 369 RPC URL
const CONTRACT_ADDRESS = '0x4Ca5e92D67Fe647F1f8E6f21bd4D6Ff4aE35dA8e'; // Replace with your contract address

	const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

// Initialize contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  try {
    // Convert amount to BigInt if it's a regular number
    const amountBigInt = BigInt(amount);
   
    // Call the contract function
    const result = await contract.getWithPLS(amountBigInt, poolAddress);
    
    console.log('Function Result:', result.toString());
    return result;
  } catch (error) {
    console.error('Error calling getWithPLS:', error);
    throw error;
  }

}

async function callGetWithPLSX(amount, poolAddress) {
		const RPC_URL = 'https://rpc-pulsechain.g4mm4.io'; // Network 369 RPC URL
const CONTRACT_ADDRESS = '0x4Ca5e92D67Fe647F1f8E6f21bd4D6Ff4aE35dA8e'; // Replace with your contract address

	const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

// Initialize contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  try {
    // Convert amount to BigInt if it's a regular number
    const amountBigInt = BigInt(amount);
   
    // Call the contract function
    const result = await contract.getWithPLSX(amountBigInt, poolAddress);
    
    console.log('Function Result:', result.toString());
    return result;
  } catch (error) {
    console.error('Error calling getWithPLS:', error);
    throw error;
  }

}

async function callGetWithINC(amount, poolAddress) {
	const RPC_URL = 'https://rpc-pulsechain.g4mm4.io'; // Network 369 RPC URL
const CONTRACT_ADDRESS = '0x4Ca5e92D67Fe647F1f8E6f21bd4D6Ff4aE35dA8e'; // Replace with your contract address


	const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

// Initialize contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  try {
    // Convert amount to BigInt if it's a regular number
    const amountBigInt = BigInt(amount);
   
    // Call the contract function
    const result = await contract.getWithINC(amountBigInt, poolAddress);
    
    console.log('Function Result:', result.toString());
    return result;
  } catch (error) {
    console.error('Error calling getWithPLS:', error);
    throw error;
  }

}

async function callGetWithHEX(amount, poolAddress) {
	const RPC_URL = 'https://rpc-pulsechain.g4mm4.io'; // Network 369 RPC URL
const CONTRACT_ADDRESS = '0x4Ca5e92D67Fe647F1f8E6f21bd4D6Ff4aE35dA8e'; // Replace with your contract address


	const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

// Initialize contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  try {
    // Convert amount to BigInt if it's a regular number
    const amountBigInt = BigInt(amount);
   
    // Call the contract function
    const result = await contract.getWithHEX(amountBigInt, poolAddress);
    
    console.log('Function Result:', result.toString());
    return result;
  } catch (error) {
    console.error('Error calling getWithPLS:', error);
    throw error;
  }

}

getOinkBalance()
var remainingOink

async function getOinkBalance() {
	const RPC_URL = 'https://rpc-pulsechain.g4mm4.io'; // Network 369 RPC URL
const CONTRACT_ADDRESS = '0x4Ca5e92D67Fe647F1f8E6f21bd4D6Ff4aE35dA8e'; // Replace with your contract address


	const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

// Initialize contract instance
const contract = new ethers.Contract("0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38", ABIerc20, provider);

  try {

    // Call the contract function
    const result = await contract.balanceOf(CONTRACT_ADDRESS);
    remainingOink = result
    console.log('Function Result:', result.toString());
	document.getElementById("remaining").innerHTML = '<strong>' + Number(BigInt(result)/BigInt(10**18)).toLocaleString() + ' OINK</strong> available';
    return result;
  } catch (error) {
    console.error('Error calling getWithPLS:', error);
    throw error;
  }

}

