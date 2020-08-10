const Dev = require('../models/Dev')
const parseStringAsArray = require('../utils/parseStringAsArray')
const apiGitHubGetUser = require('../utils/apiGitHubGetUser')
const {findConnections, sendMessage} = require ('../websocket')


//index, show, store, update, destroy

module.exports = {
    async index(request,response){
        const devs = await Dev.find();

        return response.json(devs);
    },

    async store (request, response){
        const {github_username, techs, latitude, longitude} = request.body
        
        let dev = await Dev.findOne({github_username});
    
        if (!dev){
            const responseApiGitHub = apiGitHubGetUser(github_username);
            
            responseApiGitHub.then(apiResponse => {
                let { name, avatar_url, bio } = apiResponse.data;
                if(!name)
                    name = apiResponse.data.login
            

                const techsArray = parseStringAsArray(techs)
            
                const location = {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                }
                
                let dev = {
                    github_username,
                    name,
                    avatar_url,
                    bio,
                    techs: techsArray,
                    location
                }
                Dev.create(dev)
            
                const sendSocketMessageto = findConnections(
                    {latitude, longitude},
                    techsArray
                )
                sendMessage(sendSocketMessageto, 'new-dev', dev);

                return response.json(dev) 
            }).catch(erro => {return response.status(404).send(
                {
                    Mensagem: "Erro ao tentar localizar Usuário no GitHub",
                    Detalhes: erro
                }
            )})
             
        } else {
            return response.status(400).send({error: "Desenvolvedor já Cadastrado"})
        }
        
    },
    async update (request,response){
        //nome,avatar,bio,location, tech - não atualizar o username 
        const {github_username} = request.params
        let dev = await Dev.findOne({github_username});
        if (!dev){
            return response.status(400).send({error: "Desenvolvedor não cadastrado"})
        }
        const apiResponse = await apiGitHubGetUser(github_username);
        
        let { name, avatar_url, bio } = apiResponse
        if(!name)
                name = apiResponse.data.login

        const {techs, latitude, longitude} = request.body
    
        const techsArray = parseStringAsArray(techs)

        const location = {
            type: 'Point',
            coordinates: [longitude, latitude]
        }
        
        let updatedDev = {
            github_username,
            name,
            avatar_url,
            bio,
            techs: techsArray,
            location
        }

        await Dev.update(updatedDev)
        return response.json(updatedDev)  
    },

    async destroy(request, response){
        const {github_username} = request.params
        let dev = await Dev.findOne({github_username});
        if (!dev){
            return response.status(400).send({error: "Desenvolvedor não cadastrado"})
        }
        await Dev.deleteOne({github_username})
        return response.json({message: 'Usuario Deletado',dev}) 
    }
}