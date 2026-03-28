// contracts/k_bank/Bank.cdc
// K-Bank: Consumer DeFi Funding Platform with DAO Governance

import FungibleToken from 0xFUNGIBLETOKEN
import FlowToken from 0xFLOWTOKEN
import Governance from ./Governance

pub contract KBank {

    // Event declarations
    pub event FundsDeposited(account: Address, amount: UFix64, timestamp: UInt64)
    pub event FundsWithdrawn(account: Address, amount: UFix64, timestamp: UInt64)
    pub event ProposalCreated(proposalId: UInt64, title: String, fundingAmount: UFix64)
    pub event VoteCast(proposalId: UInt64, voter: Address, support: Bool, amount: UFix64)
    pub event ProposalExecuted(proposalId: UInt64, timestamp: UInt64)
    pub event InsuranceClaimSubmitted(claimId: String, amount: UFix64, timestamp: UInt64)
    pub event ClaimPaid(claimId: String, amount: UFix64, timestamp: UInt64)
    pub event ClaimDenied(claimId: String, reason: String, timestamp: UInt64)

    // Resource for user vault
    pub resource Vault {
        pub let owner: Address
        pub var balance: UFix64
        pub var stakedAmount: UFix64
        pub var stakedUntil: UInt64?

        pub fun deposit(amount: UFix64) {
            self.balance = self.balance + amount
        }

        pub fun withdraw(amount: UFix64) {
            assert(self.balance >= amount, message: "Insufficient balance")
            self.balance = self.balance - amount
        }

        pub fun stake(amount: UFix64, duration: UInt64?) {
            assert(self.balance >= amount, message: "Insufficient balance")
            self.balance = self.balance - amount
            self.stakedAmount = self.stakedAmount + amount
            if duration != nil {
                self.stakedUntil = block.timestamp + duration!
            }
        }

        pub fun getBalance(): UFix64 {
            return self.balance
        }

        pub fun getStakedAmount(): UFix64 {
            return self.stakedAmount
        }

        pub fun getAvailableBalance(): UFix64 {
            return self.balance
        }
    }

    // Resource for proposal context
    pub resource ProposalContext {
        pub let vaultRef: @Vault
        pub let governanceRef: &Governance.Governance

        pub fun createFundingProposal(
            title: String,
            description: String,
            fundingAmount: UFix64,
            votingPeriod: UInt64
        ): UInt64 {
            // Get or create voter
            let voter = self.governanceRef.getVoter(address: self.vaultRef.owner)

            let proposal <- self.governanceRef.createProposal(
                title: title,
                description: description,
                proposer: voter,
                votingPeriod: votingPeriod
            )

            emit ProposalCreated(
                proposalId: proposal.id,
                title: title,
                fundingAmount: fundingAmount
            )

            return proposal.id
        }

        pub fun voteOnProposal(proposalId: UInt64, support: Bool, amount: UFix64) {
            let proposal = self.governanceRef.getProposal(id: proposalId)!
            let voter = self.governanceRef.getVoter(address: self.vaultRef.owner)

            proposal.vote(voter: voter, amount: amount, support: support)

            emit VoteCast(
                proposalId: proposalId,
                voter: self.vaultRef.owner,
                support: support,
                amount: amount
            )
        }

        pub fun executeProposal(proposalId: UInt64) {
            let proposal = self.governanceRef.getProposal(id: proposalId)!

            assert(!proposal.executed, message: "Proposal already executed")
            assert(block.timestamp >= proposal.votingEndTime, message: "Voting not ended")

            // Calculate if passed
            let totalVotes = proposal.votesFor + proposal.votesAgainst
            let quorumReached = totalVotes >= (self.governanceRef.totalSupply * self.governanceRef.quorumPercentage) / 10000
            let thresholdMet = proposal.votesFor > (totalVotes * self.governanceRef.thresholdPercentage) / 10000

            assert(quorumReached, message: "Quorum not reached")
            assert(thresholdMet, message: "Threshold not met")

            proposal.execute()
            emit ProposalExecuted(proposalId: proposalId, timestamp: block.timestamp)
        }

        pub fun submitClaim(claimId: String, amount: UFix64) {
            assert(amount <= self.vaultRef.balance * 0.2, message: "Claim exceeds 20% of balance")

            emit InsuranceClaimSubmitted(
                claimId: claimId,
                amount: amount,
                timestamp: block.timestamp
            )
        }

        pub fun payClaim(claimId: String, amount: UFix64) {
            assert(self.vaultRef.balance >= amount, message: "Insufficient funds for payout")

            self.vaultRef.withdraw(amount: amount)
            emit ClaimPaid(
                claimId: claimId,
                amount: amount,
                timestamp: block.timestamp
            )
        }

        pub fun getProposalStats(proposalId: UInt64): {String: AnyStruct} {
            let proposal = self.governanceRef.getProposal(id: proposalId)!
            return proposal.getResult()
        }

        pub fun getGovernanceStats(): {String: AnyStruct} {
            return self.governanceRef.getStats()
        }

        destroy() {
            destroy self.vaultRef
        }
    }

    pub let storagePath: StoragePath
    pub let publicPath: PublicPath

    pub var vaults: @{Address: Vault}
    pub var governance: @Governance.Governance

    pub fun createVault(owner: Address): @Vault {
        let vault <- create Vault(owner: owner, balance: 0.0, stakedAmount: 0.0, stakedUntil: nil)
        self.vaults[owner] <-! vault
        emit FundsDeposited(account: owner, amount: 0.0, timestamp: block.timestamp)
        return <-self.vaults.remove(key: owner)!
    }

    pub fun getVault(owner: Address): &Vault? {
        return self.vaults[owner]
    }

    pub fun getProposalContext(owner: Address): @ProposalContext {
        let vaultRef = self.vaults[owner]!
        let governanceRef = &self.governance as &Governance.Governance

        return create ProposalContext(vaultRef: <-vaultRef, governanceRef: governanceRef)
    }

    pub fun deposit(owner: Address, amount: UFix64) {
        let vault = self.vaults[owner]!
        vault.deposit(amount: amount)

        emit FundsDeposited(
            account: owner,
            amount: amount,
            timestamp: block.timestamp
        )
    }

    pub fun withdraw(owner: Address, amount: UFix64) {
        let vault = self.vaults[owner]!
        vault.withdraw(amount: amount)

        emit FundsWithdrawn(
            account: owner,
            amount: amount,
            timestamp: block.timestamp
        )
    }

    pub fun stake(owner: Address, amount: UFix64, duration: UInt64?) {
        let vault = self.vaults[owner]!
        vault.stake(amount: amount, duration: duration)
    }

    pub fun getStats(): {String: UFix64} {
        var totalDeposits: UFix64 = 0.0
        var totalStaked: UFix64 = 0.0
        var vaultCount: UInt64 = 0

        for vault in self.vaults.values() {
            totalDeposits = totalDeposits + vault.balance
            totalStaked = totalStaked + vault.stakedAmount
            vaultCount = vaultCount + 1
        }

        let governanceStats = self.governance.getStats()

        return {
            "totalDeposits": totalDeposits,
            "totalStaked": totalStaked,
            "vaultCount": UFix64(vaultCount),
            "totalProposals": governanceStats["totalProposals"] as! UFix64,
            "activeProposals": governanceStats["activeProposals"] as! UFix64
        }
    }

    pub init() {
        self.storagePath = /storage/KBankVault
        self.publicPath = /public/KBankVault
        self.vaults <- {}
        self.governance <- create Governance.Governance()
    }
}
