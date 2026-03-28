// contracts/k_bank/Governance.cdc
// Production-ready DAO governance for K-Bank

pub contract Governance {

    // State variables
    pub var totalSupply: UInt256
    pub let storagePath: StoragePath
    pub let publicPath: PublicPath

    // Maximum voting period (7 days)
    pub let maxVotingPeriod: UInt64 = 604800
    pub let minVotingPeriod: UInt64 = 86400 // 1 day minimum

    // Quorum requirement (10% of total supply)
    pub let quorumPercentage: UInt256 = 1000 // 10.00% in basis points

    // Threshold for passing (50% + 1)
    pub let thresholdPercentage: UInt256 = 5001 // 50.01% in basis points

    pub resource Proposal {
        pub let id: UInt64
        pub let title: String
        pub let description: String
        pub let proposer: Address
        pub let createdAt: UInt64
        pub let votingStartTime: UInt64
        pub let votingEndTime: UInt64
        pub var votesFor: UInt256
        pub var votesAgainst: UInt256
        pub var executed: Bool
        pub var cancelled: Bool

        pub fun startVoting(voter: &Voter) {
            assert(voter.proposals[self.id] == nil, message: "Already voted on this proposal")
        }

        pub fun vote(voter: &Voter, amount: UInt256, support: Bool) {
            assert(!self.executed, message: "Proposal already executed")
            assert(!self.cancelled, message: "Proposal cancelled")
            assert(voter.proposals[self.id] == nil, message: "Already voted on this proposal")
            assert(block.timestamp >= self.votingStartTime, message: "Voting not started")
            assert(block.timestamp <= self.votingEndTime, message: "Voting period ended")

            if support {
                self.votesFor += amount
            } else {
                self.votesAgainst += amount
            }

            voter.proposals[self.id] = true
            voter.lockedTokens += amount
        }

        pub fun execute() {
            assert(!self.executed, message: "Already executed")
            assert(!self.cancelled, message: "Proposal cancelled")
            assert(block.timestamp >= self.votingEndTime, message: "Voting not ended")
            assert(self.votesFor + self.votesAgainst >= (self.totalSupply * self.quorumPercentage) / 10000,
                   message: "Quorum not reached")
            assert(self.votesFor > (self.votesFor + self.votesAgainst) * self.thresholdPercentage / 10000,
                   message: "Threshold not met")

            self.executed = true
        }

        pub fun getResult(): {String: AnyStruct} {
            let total = self.votesFor + self.votesAgainst
            let forPercentage = total > 0 ? (self.votesFor * 10000) / total : 0
            let againstPercentage = total > 0 ? (self.votesAgainst * 10000) / total : 0
            let participation = total > 0 ? (total * 10000) / self.totalSupply : 0

            return {
                "id": self.id,
                "title": self.title,
                "description": self.description,
                "proposer": self.proposer,
                "votesFor": self.votesFor,
                "votesAgainst": self.votesAgainst,
                "forPercentage": forPercentage,
                "againstPercentage": againstPercentage,
                "participation": participation,
                "quorumMet": participation >= self.quorumPercentage,
                "passed": forPercentage > self.thresholdPercentage,
                "executed": self.executed,
                "cancelled": self.cancelled
            }
        }
    }

    pub resource Voter {
        pub let lockedTokens: UInt256
        pub var proposals: {UInt64: Bool}

        pub fun lockTokens(amount: UInt256) {
            self.lockedTokens += amount
        }

        pub fun unlockTokens(amount: UInt256) {
            assert(self.lockedTokens >= amount, message: "Not enough locked tokens")
            self.lockedTokens -= amount
        }
    }

    pub var proposals: {UInt64: Proposal}
    pub var voters: {Address: Voter}
    pub var proposalCounter: UInt64

    pub fun createProposal(
        title: String,
        description: String,
        proposer: &Voter,
        votingPeriod: UInt64
    ): Proposal {
        assert(votingPeriod >= self.minVotingPeriod, message: "Voting period too short")
        assert(votingPeriod <= self.maxVotingPeriod, message: "Voting period too long")

        let now = block.timestamp
        let proposal = create Proposal(
            id: self.proposalCounter,
            title: title,
            description: description,
            proposer: proposer.address,
            createdAt: now,
            votingStartTime: now,
            votingEndTime: now + votingPeriod,
            votesFor: 0,
            votesAgainst: 0,
            executed: false,
            cancelled: false
        )

        self.proposals[self.proposalCounter] = proposal
        self.proposalCounter += 1

        return proposal
    }

    pub fun getVoter(address: Address): &Voter {
        if let existing = self.voters[address] {
            return &existing as &Voter
        }

        let voter <- create Voter(lockedTokens: 0, proposals: {})
        self.voters[address] <-! voter
        return &self.voters[address] as &Voter
    }

    pub fun getProposal(id: UInt64): Proposal? {
        return self.proposals[id]
    }

    pub fun getAllProposals(): [{UInt64: Proposal}] {
        return self.proposals
    }

    pub fun getActiveProposals(): [{UInt64: Proposal}] {
        let active = self.proposals.filter({(id: UInt64, p: Proposal) in
            !p.executed && !p.cancelled && block.timestamp <= p.votingEndTime
        })
        return active
    }

    pub fun getPassedProposals(): [{UInt64: Proposal}] {
        let passed = self.proposals.filter({(id: UInt64, p: Proposal) in
            p.executed
        })
        return passed
    }

    pub fun getStats(): {String: AnyStruct} {
        let totalProposals = UInt64(self.proposals.length)
        var activeProposals: UInt64 = 0
        var passedProposals: UInt64 = 0
        var totalVotes: UInt256 = 0

        for proposal in self.proposals.values() {
            if !proposal.executed && !proposal.cancelled && block.timestamp <= proposal.votingEndTime {
                activeProposals += 1
            }
            if proposal.executed {
                passedProposals += 1
            }
            totalVotes = totalVotes + proposal.votesFor + proposal.votesAgainst
        }

        return {
            "totalProposals": totalProposals,
            "activeProposals": activeProposals,
            "passedProposals": passedProposals,
            "totalVoters": UInt64(self.voters.length),
            "totalVotes": totalVotes,
            "quorumPercentage": self.quorumPercentage,
            "thresholdPercentage": self.thresholdPercentage,
            "totalSupply": self.totalSupply
        }
    }

    pub fun cancelProposal(proposalId: UInt64, governor: &Voter) {
        assert(governor.address == 0x0000000000000001, message: "Only governor can cancel")
        let proposal = self.proposals[proposalId] ?? panic("Proposal not found")
        proposal.cancelled = true
    }

    pub init() {
        self.totalSupply = 1000000000 // 1B governance tokens
        self.storagePath = /storage/GovernanceGovernor
        self.publicPath = /public/GovernanceGovernor
        self.proposals = {}
        self.voters = {}
        self.proposalCounter = 0

        // Create governor account (admin functions)
        let governor <- create Voter(lockedTokens: 0, proposals: {})
        self.voters[0x0000000000000001] <-! governor
    }
}
